import { EventEmitter } from 'events';
import pino from 'pino';
import { db } from '@nexusdialer/database';
import { leads, campaigns } from '@nexusdialer/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { FreeSWITCHCommands } from '../freeswitch/commands';
import { CallService } from '../services/call-service';

const logger = pino({ name: 'preview-dialer' });

export interface PreviewDialerConfig {
  campaignId: string;
  tenantId: string;
  previewTime: number; // Time agent has to preview lead (seconds)
  callTimeout: number; // Call timeout in seconds
  autoDialAfterPreview: boolean; // Auto-dial when preview time expires
}

export interface PreviewMetrics {
  totalPreviews: number;
  totalCalls: number;
  acceptedPreviews: number;
  rejectedPreviews: number;
  skippedPreviews: number;
  activeAgents: number;
}

export interface PreviewRequest {
  id: string;
  agentId: string;
  leadId: string;
  lead: any;
  requestedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'skipped' | 'expired';
}

export class PreviewDialer extends EventEmitter {
  private config: PreviewDialerConfig;
  private fsCommands: FreeSWITCHCommands;
  private callService: CallService;
  private isRunning = false;
  private activePreviewRequests: Map<string, PreviewRequest> = new Map();
  private metrics: PreviewMetrics;
  private previewCheckInterval?: NodeJS.Timeout;

  constructor(
    config: PreviewDialerConfig,
    fsCommands: FreeSWITCHCommands,
    callService: CallService
  ) {
    super();
    this.config = config;
    this.fsCommands = fsCommands;
    this.callService = callService;

    this.metrics = {
      totalPreviews: 0,
      totalCalls: 0,
      acceptedPreviews: 0,
      rejectedPreviews: 0,
      skippedPreviews: 0,
      activeAgents: 0,
    };
  }

  /**
   * Start the preview dialer
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn({ campaignId: this.config.campaignId }, 'Dialer already running');
      return;
    }

    this.isRunning = true;
    logger.info({ campaignId: this.config.campaignId }, 'Starting preview dialer');

    // Start preview expiration check
    this.previewCheckInterval = setInterval(() => {
      this.checkExpiredPreviews();
    }, 1000);

    this.emit('started', { campaignId: this.config.campaignId });
  }

  /**
   * Stop the preview dialer
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info({ campaignId: this.config.campaignId }, 'Stopping preview dialer');

    if (this.previewCheckInterval) {
      clearInterval(this.previewCheckInterval);
      this.previewCheckInterval = undefined;
    }

    // Cancel all active preview requests
    for (const [_, preview] of this.activePreviewRequests) {
      if (preview.status === 'pending') {
        preview.status = 'expired';
        this.emit('preview-expired', { previewId: preview.id, agentId: preview.agentId });
      }
    }

    this.activePreviewRequests.clear();

    this.emit('stopped', { campaignId: this.config.campaignId });
  }

  /**
   * Request next lead for agent to preview
   */
  async requestNextLead(agentId: string): Promise<PreviewRequest | null> {
    try {
      // Check if agent already has an active preview
      const existingPreview = Array.from(this.activePreviewRequests.values()).find(
        (p) => p.agentId === agentId && p.status === 'pending'
      );

      if (existingPreview) {
        logger.info({ agentId, previewId: existingPreview.id }, 'Agent already has active preview');
        return existingPreview;
      }

      // Get next lead
      const lead = await this.getNextLead();

      if (!lead) {
        logger.info({ agentId }, 'No leads available');
        this.emit('no-leads-available', { agentId, campaignId: this.config.campaignId });
        return null;
      }

      // Create preview request
      const now = new Date();
      const previewRequest: PreviewRequest = {
        id: `preview_${Date.now()}_${agentId}`,
        agentId,
        leadId: lead.id,
        lead,
        requestedAt: now,
        expiresAt: new Date(now.getTime() + this.config.previewTime * 1000),
        status: 'pending',
      };

      this.activePreviewRequests.set(previewRequest.id, previewRequest);
      this.metrics.totalPreviews++;

      logger.info(
        {
          previewId: previewRequest.id,
          agentId,
          leadId: lead.id,
          phoneNumber: lead.phoneNumber,
        },
        'Preview request created'
      );

      this.emit('preview-requested', {
        previewId: previewRequest.id,
        agentId,
        lead,
      });

      return previewRequest;
    } catch (error) {
      logger.error({ error, agentId }, 'Error requesting next lead');
      return null;
    }
  }

  /**
   * Agent accepts preview and initiates call
   */
  async acceptPreview(previewId: string): Promise<void> {
    const preview = this.activePreviewRequests.get(previewId);

    if (!preview) {
      throw new Error('Preview request not found');
    }

    if (preview.status !== 'pending') {
      throw new Error(`Preview already ${preview.status}`);
    }

    const now = new Date();
    if (now > preview.expiresAt) {
      preview.status = 'expired';
      this.activePreviewRequests.delete(previewId);
      throw new Error('Preview has expired');
    }

    preview.status = 'accepted';
    this.metrics.acceptedPreviews++;

    logger.info(
      {
        previewId,
        agentId: preview.agentId,
        leadId: preview.leadId,
      },
      'Preview accepted, initiating call'
    );

    // Initiate the call
    await this.dialLead(preview.lead, preview.agentId);

    // Clean up preview request
    this.activePreviewRequests.delete(previewId);

    this.emit('preview-accepted', {
      previewId,
      agentId: preview.agentId,
      leadId: preview.leadId,
    });
  }

  /**
   * Agent rejects preview (lead not suitable)
   */
  async rejectPreview(previewId: string, reason?: string): Promise<void> {
    const preview = this.activePreviewRequests.get(previewId);

    if (!preview) {
      throw new Error('Preview request not found');
    }

    if (preview.status !== 'pending') {
      throw new Error(`Preview already ${preview.status}`);
    }

    preview.status = 'rejected';
    this.metrics.rejectedPreviews++;

    logger.info(
      {
        previewId,
        agentId: preview.agentId,
        leadId: preview.leadId,
        reason,
      },
      'Preview rejected'
    );

    // Update lead status
    await db
      .update(leads)
      .set({
        status: 'rejected',
        metadata: sql`${leads.metadata} || ${JSON.stringify({ rejectedReason: reason, rejectedAt: new Date() })}::jsonb`,
      })
      .where(eq(leads.id, preview.leadId));

    // Clean up preview request
    this.activePreviewRequests.delete(previewId);

    this.emit('preview-rejected', {
      previewId,
      agentId: preview.agentId,
      leadId: preview.leadId,
      reason,
    });
  }

  /**
   * Agent skips preview (will be offered to another agent)
   */
  async skipPreview(previewId: string): Promise<void> {
    const preview = this.activePreviewRequests.get(previewId);

    if (!preview) {
      throw new Error('Preview request not found');
    }

    if (preview.status !== 'pending') {
      throw new Error(`Preview already ${preview.status}`);
    }

    preview.status = 'skipped';
    this.metrics.skippedPreviews++;

    logger.info(
      {
        previewId,
        agentId: preview.agentId,
        leadId: preview.leadId,
      },
      'Preview skipped'
    );

    // Update lead - mark as skipped by this agent
    await db
      .update(leads)
      .set({
        metadata: sql`${leads.metadata} || ${JSON.stringify({ skippedBy: [preview.agentId], skippedAt: new Date() })}::jsonb`,
      })
      .where(eq(leads.id, preview.leadId));

    // Clean up preview request
    this.activePreviewRequests.delete(previewId);

    this.emit('preview-skipped', {
      previewId,
      agentId: preview.agentId,
      leadId: preview.leadId,
    });
  }

  /**
   * Check for expired preview requests
   */
  private checkExpiredPreviews(): void {
    const now = new Date();

    for (const [previewId, preview] of this.activePreviewRequests) {
      if (preview.status === 'pending' && now > preview.expiresAt) {
        logger.info(
          {
            previewId,
            agentId: preview.agentId,
            leadId: preview.leadId,
          },
          'Preview expired'
        );

        if (this.config.autoDialAfterPreview) {
          // Auto-dial when preview expires
          preview.status = 'accepted';
          this.metrics.acceptedPreviews++;

          this.dialLead(preview.lead, preview.agentId).catch((error) => {
            logger.error({ error, previewId }, 'Error auto-dialing after preview expiry');
          });
        } else {
          preview.status = 'expired';
        }

        this.activePreviewRequests.delete(previewId);

        this.emit('preview-expired', {
          previewId,
          agentId: preview.agentId,
          leadId: preview.leadId,
          autoDialed: this.config.autoDialAfterPreview,
        });
      }
    }
  }

  /**
   * Get next lead to preview
   */
  private async getNextLead(): Promise<any | null> {
    try {
      const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, this.config.campaignId),
      });

      if (!campaign) {
        logger.warn({ campaignId: this.config.campaignId }, 'Campaign not found');
        return null;
      }

      // Get next lead that hasn't been called recently
      const nextLead = await db.query.leads.findFirst({
        where: and(
          eq(leads.campaignId, this.config.campaignId),
          eq(leads.status, 'active'),
          sql`(${leads.lastCallAttempt} IS NULL OR ${leads.lastCallAttempt} < NOW() - INTERVAL '1 hour')`
        ),
        orderBy: (leads, { asc }) => [asc(leads.priority), asc(leads.lastCallAttempt)],
      });

      return nextLead || null;
    } catch (error) {
      logger.error({ error }, 'Error fetching next lead');
      return null;
    }
  }

  /**
   * Dial a lead
   */
  private async dialLead(lead: any, agentId: string): Promise<void> {
    try {
      logger.info(
        { leadId: lead.id, phoneNumber: lead.phoneNumber, agentId },
        'Dialing lead'
      );

      // Create call record
      const call = await this.callService.createCall({
        tenantId: this.config.tenantId,
        campaignId: this.config.campaignId,
        leadId: lead.id,
        phoneNumber: lead.phoneNumber,
        callerId: lead.callerId,
        direction: 'outbound',
        metadata: {
          dialMode: 'preview',
          agentId,
          leadData: lead.customData,
        },
      });

      // Update agent status
      await this.callService.updateAgentStatus(
        agentId,
        this.config.tenantId,
        'on_call',
        call.id
      );

      // Originate call
      const jobId = await this.fsCommands.originate({
        phoneNumber: lead.phoneNumber,
        callerId: lead.callerId,
        timeout: this.config.callTimeout,
        variables: {
          nexus_call_id: call.id,
          nexus_campaign_id: this.config.campaignId,
          nexus_lead_id: lead.id,
          nexus_tenant_id: this.config.tenantId,
          nexus_agent_id: agentId,
        },
        ignoreEarlyMedia: false,
        ringReady: true,
      });

      // Update lead
      await db
        .update(leads)
        .set({
          status: 'dialing',
          lastCallAttempt: new Date(),
          callAttempts: sql`${leads.callAttempts} + 1`,
        })
        .where(eq(leads.id, lead.id));

      this.metrics.totalCalls++;

      this.emit('call-initiated', {
        callId: call.id,
        leadId: lead.id,
        agentId,
        phoneNumber: lead.phoneNumber,
        jobId,
      });

      logger.info(
        { callId: call.id, leadId: lead.id, agentId, jobId },
        'Call initiated'
      );
    } catch (error) {
      logger.error({ error, leadId: lead.id, agentId }, 'Error dialing lead');

      this.emit('call-failed', {
        leadId: lead.id,
        agentId,
        phoneNumber: lead.phoneNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get active preview for agent
   */
  getAgentPreview(agentId: string): PreviewRequest | null {
    return (
      Array.from(this.activePreviewRequests.values()).find(
        (p) => p.agentId === agentId && p.status === 'pending'
      ) || null
    );
  }

  /**
   * Get all active previews
   */
  getActivePreviews(): PreviewRequest[] {
    return Array.from(this.activePreviewRequests.values()).filter(
      (p) => p.status === 'pending'
    );
  }

  /**
   * Get current metrics
   */
  getMetrics(): PreviewMetrics {
    return { ...this.metrics };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PreviewDialerConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };

    logger.info({ updates }, 'Configuration updated');
  }
}
