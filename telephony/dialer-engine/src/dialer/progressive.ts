import { EventEmitter } from 'events';
import pino from 'pino';
import { db } from '@nexusdialer/database';
import { leads, campaigns } from '@nexusdialer/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { FreeSWITCHCommands } from '../freeswitch/commands';
import { CallService, type AgentStatus } from '../services/call-service';

const logger = pino({ name: 'progressive-dialer' });

export interface ProgressiveDialerConfig {
  campaignId: string;
  tenantId: string;
  callsPerAgent: number; // Usually 1 for true progressive
  callTimeout: number; // Call timeout in seconds
  agentWaitTime: number; // How long to wait for agent before abandoning (seconds)
}

export interface ProgressiveMetrics {
  totalCalls: number;
  answeredCalls: number;
  connectedCalls: number;
  availableAgents: number;
  busyAgents: number;
  callsWaitingForAgent: number;
}

export class ProgressiveDialer extends EventEmitter {
  private config: ProgressiveDialerConfig;
  private fsCommands: FreeSWITCHCommands;
  private callService: CallService;
  private isRunning = false;
  private dialInterval?: NodeJS.Timeout;
  private metrics: ProgressiveMetrics;
  private callsWaitingForAgent: Map<string, { callId: string; answeredAt: Date }> = new Map();

  constructor(
    config: ProgressiveDialerConfig,
    fsCommands: FreeSWITCHCommands,
    callService: CallService
  ) {
    super();
    this.config = config;
    this.fsCommands = fsCommands;
    this.callService = callService;

    this.metrics = {
      totalCalls: 0,
      answeredCalls: 0,
      connectedCalls: 0,
      availableAgents: 0,
      busyAgents: 0,
      callsWaitingForAgent: 0,
    };
  }

  /**
   * Start the progressive dialer
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn({ campaignId: this.config.campaignId }, 'Dialer already running');
      return;
    }

    this.isRunning = true;
    logger.info({ campaignId: this.config.campaignId }, 'Starting progressive dialer');

    // Start dialing loop
    this.dialInterval = setInterval(() => {
      this.dialLoop().catch((error) => {
        logger.error({ error }, 'Error in dial loop');
      });
    }, 2000); // Check every 2 seconds

    // Start agent matching loop
    setInterval(() => {
      this.matchAnsweredCallsToAgents().catch((error) => {
        logger.error({ error }, 'Error matching calls to agents');
      });
    }, 1000); // Check every second

    this.emit('started', { campaignId: this.config.campaignId });
  }

  /**
   * Stop the progressive dialer
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info({ campaignId: this.config.campaignId }, 'Stopping progressive dialer');

    if (this.dialInterval) {
      clearInterval(this.dialInterval);
      this.dialInterval = undefined;
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

      // Get available agents
      const availableAgents = await this.callService.getAvailableAgents(this.config.tenantId);

      if (availableAgents.length === 0) {
        logger.debug('No available agents');
        return;
      }

      // Calculate how many calls to make
      // In progressive mode: callsPerAgent * available agents
      const targetCalls = availableAgents.length * this.config.callsPerAgent;
      const activeCalls = await this.callService.getCampaignActiveCalls(this.config.campaignId);
      const currentCalls = activeCalls.length;
      const callsToMake = Math.max(0, targetCalls - currentCalls);

      if (callsToMake === 0) {
        return;
      }

      logger.debug(
        {
          availableAgents: availableAgents.length,
          targetCalls,
          currentCalls,
          callsToMake,
        },
        'Calculating calls to make'
      );

      // Get leads to dial
      const leadsToCall = await this.getLeadsToCall(callsToMake);

      if (leadsToCall.length === 0) {
        logger.debug('No leads available to call');
        this.emit('no-leads-available', { campaignId: this.config.campaignId });
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
   * Match answered calls to available agents
   */
  private async matchAnsweredCallsToAgents(): Promise<void> {
    if (this.callsWaitingForAgent.size === 0) {
      return;
    }

    const availableAgents = await this.callService.getAvailableAgents(this.config.tenantId);

    if (availableAgents.length === 0) {
      // Check for abandoned calls (waiting too long)
      this.checkAbandonedCalls();
      return;
    }

    // Sort agents by idle time (longest idle first)
    const sortedAgents = availableAgents.sort((a, b) => {
      const aTime = new Date(a.lastStateChange).getTime();
      const bTime = new Date(b.lastStateChange).getTime();
      return aTime - bTime;
    });

    // Match calls to agents
    for (const [phoneNumber, waitingCall] of this.callsWaitingForAgent.entries()) {
      if (sortedAgents.length === 0) {
        break;
      }

      const agent = sortedAgents.shift()!;
      await this.connectCallToAgent(waitingCall.callId, agent);
      this.callsWaitingForAgent.delete(phoneNumber);
    }

    this.metrics.callsWaitingForAgent = this.callsWaitingForAgent.size;
  }

  /**
   * Check for calls that have been waiting too long and abandon them
   */
  private checkAbandonedCalls(): void {
    const now = new Date();

    for (const [phoneNumber, waitingCall] of this.callsWaitingForAgent.entries()) {
      const waitTime = (now.getTime() - waitingCall.answeredAt.getTime()) / 1000;

      if (waitTime > this.config.agentWaitTime) {
        logger.warn(
          { callId: waitingCall.callId, waitTime },
          'Call abandoned - no agent available'
        );

        this.abandonCall(waitingCall.callId).catch((error) => {
          logger.error({ error, callId: waitingCall.callId }, 'Error abandoning call');
        });

        this.callsWaitingForAgent.delete(phoneNumber);

        this.emit('call-abandoned', {
          callId: waitingCall.callId,
          waitTime,
        });
      }
    }

    this.metrics.callsWaitingForAgent = this.callsWaitingForAgent.size;
  }

  /**
   * Connect an answered call to an agent
   */
  private async connectCallToAgent(callId: string, agent: AgentStatus): Promise<void> {
    try {
      logger.info({ callId, agentId: agent.agentId }, 'Connecting call to agent');

      const call = await this.callService.getCall(callId);

      if (!call || !call.freeswitchUuid) {
        logger.error({ callId }, 'Call not found or missing FreeSWITCH UUID');
        return;
      }

      // Update agent status
      await this.callService.updateAgentStatus(
        agent.agentId,
        agent.tenantId,
        'on_call',
        callId
      );

      // Update call with agent
      await this.callService.updateCall(callId, {
        agentId: agent.agentId,
        status: 'connected',
      });

      // In a real implementation, you would:
      // 1. Ring the agent's phone/softphone
      // 2. Bridge the calls when agent answers
      // For now, we'll emit an event that the routing service would handle

      this.metrics.connectedCalls++;
      await this.callService.incrementAgentCallCount(agent.agentId);

      this.emit('call-connected', {
        callId,
        agentId: agent.agentId,
        phoneNumber: call.phoneNumber,
      });

      logger.info({ callId, agentId: agent.agentId }, 'Call connected to agent');
    } catch (error) {
      logger.error({ error, callId, agentId: agent.agentId }, 'Error connecting call to agent');
    }
  }

  /**
   * Abandon a call (play message and hangup)
   */
  private async abandonCall(callId: string): Promise<void> {
    const call = await this.callService.getCall(callId);

    if (!call || !call.freeswitchUuid) {
      return;
    }

    try {
      // Play abandon message if configured
      // await this.fsCommands.playback(call.freeswitchUuid, '/path/to/abandon-message.wav');

      // Hangup
      await this.fsCommands.hangup(call.freeswitchUuid, 'NO_USER_RESPONSE');

      // Update call status
      await this.callService.endCall(callId, 'abandoned');

      logger.info({ callId }, 'Call abandoned');
    } catch (error) {
      logger.error({ error, callId }, 'Error abandoning call');
    }
  }

  /**
   * Update dialer metrics
   */
  private async updateMetrics(): Promise<void> {
    const availableAgents = await this.callService.getAvailableAgents(this.config.tenantId);
    this.metrics.availableAgents = availableAgents.length;

    const activeCalls = await this.callService.getCampaignActiveCalls(this.config.campaignId);
    this.metrics.busyAgents = activeCalls.filter((call) => call.agentId).length;
    this.metrics.callsWaitingForAgent = this.callsWaitingForAgent.size;
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
          dialMode: 'progressive',
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
   * Handle call answered event
   */
  onCallAnswered(callId: string, phoneNumber: string): void {
    logger.info({ callId, phoneNumber }, 'Call answered, waiting for agent');

    this.callsWaitingForAgent.set(phoneNumber, {
      callId,
      answeredAt: new Date(),
    });

    this.metrics.answeredCalls++;
    this.metrics.callsWaitingForAgent = this.callsWaitingForAgent.size;

    this.emit('call-answered', { callId, phoneNumber });
  }

  /**
   * Get current metrics
   */
  getMetrics(): ProgressiveMetrics {
    return { ...this.metrics };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ProgressiveDialerConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };

    logger.info({ updates }, 'Configuration updated');
  }
}
