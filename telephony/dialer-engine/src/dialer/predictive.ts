import { EventEmitter } from 'events';
import pino from 'pino';
import { db } from '@nexusdialer/database';
import { leads, campaigns } from '@nexusdialer/database/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { FreeSWITCHCommands } from '../freeswitch/commands';
import { CallService } from '../services/call-service';

const logger = pino({ name: 'predictive-dialer' });

export interface PredictiveDialerConfig {
  campaignId: string;
  tenantId: string;
  maxDialRatio: number; // Maximum calls per agent (e.g., 2.5)
  minDialRatio: number; // Minimum calls per agent (e.g., 1.2)
  abandonRateTarget: number; // Target abandon rate (e.g., 0.03 = 3%)
  answerRate: number; // Expected answer rate (0-1)
  avgTalkTime: number; // Average talk time in seconds
  avgWrapTime: number; // Average wrap time in seconds
  adjustmentInterval: number; // How often to adjust dial ratio (ms)
  callTimeout: number; // Call timeout in seconds
}

export interface DialerMetrics {
  totalCalls: number;
  answeredCalls: number;
  abandonedCalls: number;
  availableAgents: number;
  onCallAgents: number;
  currentDialRatio: number;
  abandonRate: number;
  answerRate: number;
  avgTalkTime: number;
  callsInProgress: number;
}

export class PredictiveDialer extends EventEmitter {
  private config: PredictiveDialerConfig;
  private fsCommands: FreeSWITCHCommands;
  private callService: CallService;
  private isRunning = false;
  private dialInterval?: NodeJS.Timeout;
  private adjustmentInterval?: NodeJS.Timeout;
  private metrics: DialerMetrics;
  private currentDialRatio: number;
  private callHistory: Array<{
    answered: boolean;
    abandoned: boolean;
    talkTime: number;
    timestamp: Date;
  }> = [];
  private readonly HISTORY_SIZE = 100;

  constructor(
    config: PredictiveDialerConfig,
    fsCommands: FreeSWITCHCommands,
    callService: CallService
  ) {
    super();
    this.config = config;
    this.fsCommands = fsCommands;
    this.callService = callService;
    this.currentDialRatio = (config.maxDialRatio + config.minDialRatio) / 2; // Start in the middle

    this.metrics = {
      totalCalls: 0,
      answeredCalls: 0,
      abandonedCalls: 0,
      availableAgents: 0,
      onCallAgents: 0,
      currentDialRatio: this.currentDialRatio,
      abandonRate: 0,
      answerRate: config.answerRate,
      avgTalkTime: config.avgTalkTime,
      callsInProgress: 0,
    };
  }

  /**
   * Start the predictive dialer
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn({ campaignId: this.config.campaignId }, 'Dialer already running');
      return;
    }

    this.isRunning = true;
    logger.info({ campaignId: this.config.campaignId }, 'Starting predictive dialer');

    // Start dialing loop
    this.dialInterval = setInterval(() => {
      this.dialLoop().catch((error) => {
        logger.error({ error }, 'Error in dial loop');
      });
    }, 1000); // Check every second

    // Start adjustment loop
    this.adjustmentInterval = setInterval(() => {
      this.adjustDialRatio();
    }, this.config.adjustmentInterval);

    this.emit('started', { campaignId: this.config.campaignId });
  }

  /**
   * Stop the predictive dialer
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info({ campaignId: this.config.campaignId }, 'Stopping predictive dialer');

    if (this.dialInterval) {
      clearInterval(this.dialInterval);
      this.dialInterval = undefined;
    }

    if (this.adjustmentInterval) {
      clearInterval(this.adjustmentInterval);
      this.adjustmentInterval = undefined;
    }

    this.emit('stopped', { campaignId: this.config.campaignId });
  }

  /**
   * Main dialing loop
   */
  private async dialLoop(): Promise<void> {
    try {
      // Update metrics
      await this.updateMetrics();

      // Calculate how many calls we should have in progress
      const targetCalls = this.calculateTargetCalls();
      const currentCalls = this.metrics.callsInProgress;
      const callsToMake = Math.max(0, targetCalls - currentCalls);

      if (callsToMake === 0) {
        return;
      }

      logger.debug(
        {
          targetCalls,
          currentCalls,
          callsToMake,
          availableAgents: this.metrics.availableAgents,
          dialRatio: this.currentDialRatio,
        },
        'Calculating calls to make'
      );

      // Get leads to dial
      const leadsToCall = await this.getLeadsToCall(callsToMake);

      if (leadsToCall.length === 0) {
        logger.debug('No leads available to call');
        return;
      }

      // Dial leads
      for (const lead of leadsToCall) {
        await this.dialLead(lead);
      }
    } catch (error) {
      logger.error({ error }, 'Error in dial loop');
    }
  }

  /**
   * Calculate target number of concurrent calls
   */
  private calculateTargetCalls(): number {
    const { availableAgents, onCallAgents } = this.metrics;
    const totalAgents = availableAgents + onCallAgents;

    if (totalAgents === 0) {
      return 0;
    }

    // Calculate based on dial ratio and available agents
    // We want to keep enough calls in progress to ensure agents are always busy
    const targetCalls = Math.ceil(availableAgents * this.currentDialRatio);

    return targetCalls;
  }

  /**
   * Adjust dial ratio based on performance
   */
  private adjustDialRatio(): void {
    const { abandonRate, abandonRateTarget, minDialRatio, maxDialRatio } = this.config;

    if (this.callHistory.length < 20) {
      // Not enough data yet
      return;
    }

    // Calculate recent abandon rate
    const recentAbandons = this.callHistory.filter((call) => call.abandoned).length;
    const currentAbandonRate = recentAbandons / this.callHistory.length;

    this.metrics.abandonRate = currentAbandonRate;

    // Adjust dial ratio
    const abandonDiff = currentAbandonRate - abandonRateTarget;

    if (Math.abs(abandonDiff) < 0.01) {
      // Within acceptable range, no adjustment needed
      return;
    }

    let adjustment = 0;

    if (abandonDiff > 0) {
      // Too many abandons, reduce dial ratio
      adjustment = -0.1 * (abandonDiff / abandonRateTarget);
    } else {
      // Too few abandons, increase dial ratio (we can be more aggressive)
      adjustment = 0.1 * Math.abs(abandonDiff / abandonRateTarget);
    }

    this.currentDialRatio = Math.max(
      minDialRatio,
      Math.min(maxDialRatio, this.currentDialRatio + adjustment)
    );

    this.metrics.currentDialRatio = this.currentDialRatio;

    logger.info(
      {
        currentAbandonRate,
        targetAbandonRate: abandonRateTarget,
        newDialRatio: this.currentDialRatio,
        adjustment,
      },
      'Adjusted dial ratio'
    );

    this.emit('dial-ratio-adjusted', {
      dialRatio: this.currentDialRatio,
      abandonRate: currentAbandonRate,
    });
  }

  /**
   * Update dialer metrics
   */
  private async updateMetrics(): Promise<void> {
    // Get available agents
    const availableAgents = await this.callService.getAvailableAgents(this.config.tenantId);
    this.metrics.availableAgents = availableAgents.length;

    // Get active calls for campaign
    const activeCalls = await this.callService.getCampaignActiveCalls(this.config.campaignId);
    this.metrics.callsInProgress = activeCalls.length;

    // Count agents on call
    this.metrics.onCallAgents = activeCalls.filter((call) => call.agentId).length;

    // Update answer rate if we have recent data
    if (this.callHistory.length > 0) {
      const recentAnswers = this.callHistory.filter((call) => call.answered).length;
      this.metrics.answerRate = recentAnswers / this.callHistory.length;

      // Update average talk time
      const answeredCalls = this.callHistory.filter((call) => call.answered);
      if (answeredCalls.length > 0) {
        const totalTalkTime = answeredCalls.reduce((sum, call) => sum + call.talkTime, 0);
        this.metrics.avgTalkTime = totalTalkTime / answeredCalls.length;
      }
    }
  }

  /**
   * Get leads to call
   */
  private async getLeadsToCall(count: number): Promise<any[]> {
    try {
      const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, this.config.campaignId),
      });

      if (!campaign) {
        logger.warn({ campaignId: this.config.campaignId }, 'Campaign not found');
        return [];
      }

      // Get leads that haven't been called or need retry
      const leadsToCall = await db.query.leads.findMany({
        where: and(
          eq(leads.campaignId, this.config.campaignId),
          eq(leads.status, 'active'),
          sql`(${leads.lastCallAttempt} IS NULL OR ${leads.lastCallAttempt} < NOW() - INTERVAL '1 hour')`
        ),
        limit: count,
        orderBy: (leads, { asc }) => [asc(leads.priority), asc(leads.lastCallAttempt)],
      });

      return leadsToCall;
    } catch (error) {
      logger.error({ error }, 'Error fetching leads');
      return [];
    }
  }

  /**
   * Dial a lead
   */
  private async dialLead(lead: any): Promise<void> {
    try {
      logger.info(
        { leadId: lead.id, phoneNumber: lead.phoneNumber },
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
          dialMode: 'predictive',
          leadData: lead.customData,
        },
      });

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
        },
        ignoreEarlyMedia: true,
        ringReady: false,
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
        phoneNumber: lead.phoneNumber,
        jobId,
      });

      logger.info(
        { callId: call.id, leadId: lead.id, jobId },
        'Call initiated'
      );
    } catch (error) {
      logger.error({ error, leadId: lead.id }, 'Error dialing lead');

      this.emit('call-failed', {
        leadId: lead.id,
        phoneNumber: lead.phoneNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Record call outcome for metrics
   */
  recordCallOutcome(outcome: {
    answered: boolean;
    abandoned: boolean;
    talkTime: number;
  }): void {
    this.callHistory.push({
      ...outcome,
      timestamp: new Date(),
    });

    // Keep only recent history
    if (this.callHistory.length > this.HISTORY_SIZE) {
      this.callHistory.shift();
    }

    if (outcome.answered) {
      this.metrics.answeredCalls++;
    }

    if (outcome.abandoned) {
      this.metrics.abandonedCalls++;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): DialerMetrics {
    return { ...this.metrics };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PredictiveDialerConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };

    logger.info({ updates }, 'Configuration updated');
  }
}
