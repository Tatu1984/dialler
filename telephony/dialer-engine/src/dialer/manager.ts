import { EventEmitter } from 'events';
import pino from 'pino';
import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@nexusdialer/database';
import { campaigns } from '@nexusdialer/database/schema';
import { eq } from 'drizzle-orm';
import { TOPICS } from '@nexusdialer/events';
import type { CallStartedEvent, CallAnsweredEvent, CallEndedEvent } from '@nexusdialer/events';
import { FreeSWITCHClient, CallEvent } from '../freeswitch/client';
import { FreeSWITCHCommands } from '../freeswitch/commands';
import { CallService } from '../services/call-service';
import { PredictiveDialer, PredictiveDialerConfig } from './predictive';
import { ProgressiveDialer, ProgressiveDialerConfig } from './progressive';
import { PreviewDialer, PreviewDialerConfig } from './preview';

const logger = pino({ name: 'dialer-manager' });

export interface DialerManagerConfig {
  freeswitchHost: string;
  freeswitchPort: number;
  freeswitchPassword: string;
  redisUrl: string;
  kafkaBrokers: string[];
}

type DialMode = 'predictive' | 'progressive' | 'preview';

export class DialerManager extends EventEmitter {
  private config: DialerManagerConfig;
  private fsClient: FreeSWITCHClient;
  private fsCommands: FreeSWITCHCommands;
  private callService: CallService;
  private kafka: Kafka;
  private producer: Producer;
  private activeCampaigns: Map<string, {
    dialer: PredictiveDialer | ProgressiveDialer | PreviewDialer;
    mode: DialMode;
  }> = new Map();
  private isInitialized = false;

  constructor(config: DialerManagerConfig) {
    super();
    this.config = config;

    // Initialize FreeSWITCH client
    this.fsClient = new FreeSWITCHClient({
      host: config.freeswitchHost,
      port: config.freeswitchPort,
      password: config.freeswitchPassword,
    });

    this.fsCommands = new FreeSWITCHCommands(this.fsClient);
    this.callService = new CallService(config.redisUrl);

    // Initialize Kafka
    this.kafka = new Kafka({
      clientId: 'dialer-engine',
      brokers: config.kafkaBrokers,
    });
    this.producer = this.kafka.producer();
  }

  /**
   * Initialize the dialer manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('Initializing dialer manager');

    // Connect to FreeSWITCH
    await this.fsClient.connect();

    // Connect to Kafka
    await this.producer.connect();

    // Set up FreeSWITCH event handlers
    this.setupFreeSWITCHEventHandlers();

    this.isInitialized = true;

    logger.info('Dialer manager initialized');
  }

  /**
   * Set up FreeSWITCH event handlers
   */
  private setupFreeSWITCHEventHandlers(): void {
    // Channel created
    this.fsClient.on('event:CHANNEL_CREATE', (event: CallEvent) => {
      this.handleChannelCreate(event).catch((error) => {
        logger.error({ error, event }, 'Error handling CHANNEL_CREATE');
      });
    });

    // Channel answered
    this.fsClient.on('event:CHANNEL_ANSWER', (event: CallEvent) => {
      this.handleChannelAnswer(event).catch((error) => {
        logger.error({ error, event }, 'Error handling CHANNEL_ANSWER');
      });
    });

    // Channel hangup
    this.fsClient.on('event:CHANNEL_HANGUP_COMPLETE', (event: CallEvent) => {
      this.handleChannelHangup(event).catch((error) => {
        logger.error({ error, event }, 'Error handling CHANNEL_HANGUP_COMPLETE');
      });
    });
  }

  /**
   * Handle channel create event
   */
  private async handleChannelCreate(event: CallEvent): Promise<void> {
    const callId = event.raw?.variable_nexus_call_id;

    if (!callId) {
      return; // Not a NexusDialer call
    }

    logger.info({ callId, uuid: event.uuid }, 'Channel created');

    // Update call with FreeSWITCH UUID
    await this.callService.updateCall(callId, {
      freeswitchUuid: event.uuid,
      sipCallId: event.callId,
      status: 'ringing',
    });
  }

  /**
   * Handle channel answer event
   */
  private async handleChannelAnswer(event: CallEvent): Promise<void> {
    const callId = event.raw?.variable_nexus_call_id;
    const campaignId = event.raw?.variable_nexus_campaign_id;
    const tenantId = event.raw?.variable_nexus_tenant_id;

    if (!callId || !tenantId) {
      return;
    }

    logger.info({ callId, uuid: event.uuid }, 'Channel answered');

    // Update call in Redis
    await this.callService.answerCall(callId);

    // Get call details
    const call = await this.callService.getCall(callId);

    if (!call) {
      logger.error({ callId }, 'Call not found after answer');
      return;
    }

    // Publish event
    await this.publishEvent<CallAnsweredEvent>(TOPICS.CALLS_ANSWERED, {
      eventId: uuidv4(),
      tenantId,
      timestamp: new Date().toISOString(),
      version: '1.0',
      type: 'calls.answered',
      payload: {
        callId,
        agentId: call.agentId!,
        answerTime: call.answerTime!,
        ringDuration: call.ringDuration!,
      },
    });

    // Notify campaign dialer
    if (campaignId) {
      const campaign = this.activeCampaigns.get(campaignId);

      if (campaign) {
        if (campaign.mode === 'progressive') {
          (campaign.dialer as ProgressiveDialer).onCallAnswered(callId, call.phoneNumber);
        }
      }
    }
  }

  /**
   * Handle channel hangup event
   */
  private async handleChannelHangup(event: CallEvent): Promise<void> {
    const callId = event.raw?.variable_nexus_call_id;
    const tenantId = event.raw?.variable_nexus_tenant_id;
    const hangupCause = event.hangupCause || 'NORMAL_CLEARING';

    if (!callId || !tenantId) {
      return;
    }

    logger.info({ callId, uuid: event.uuid, hangupCause }, 'Channel hangup');

    // Determine call status
    let status: 'completed' | 'abandoned' | 'failed' | 'no_answer' | 'busy' = 'completed';

    switch (hangupCause) {
      case 'NO_ANSWER':
      case 'NO_USER_RESPONSE':
        status = 'no_answer';
        break;
      case 'USER_BUSY':
      case 'CALL_REJECTED':
        status = 'busy';
        break;
      case 'ORIGINATOR_CANCEL':
      case 'LOSE_RACE':
        status = 'abandoned';
        break;
      case 'NORMAL_CLEARING':
      case 'SUCCESS':
        status = 'completed';
        break;
      default:
        status = 'failed';
    }

    // End call
    const call = await this.callService.endCall(callId, status);

    if (!call) {
      logger.error({ callId }, 'Call not found for hangup');
      return;
    }

    // Publish event
    await this.publishEvent<CallEndedEvent>(TOPICS.CALLS_ENDED, {
      eventId: uuidv4(),
      tenantId,
      timestamp: new Date().toISOString(),
      version: '1.0',
      type: 'calls.ended',
      payload: {
        callId,
        agentId: call.agentId,
        endTime: call.endTime!,
        status,
        talkDuration: call.talkDuration,
        totalDuration: Math.floor(
          (new Date(call.endTime!).getTime() - new Date(call.startTime).getTime()) / 1000
        ),
      },
    });

    // Update agent status if call had an agent
    if (call.agentId) {
      await this.callService.updateAgentStatus(
        call.agentId,
        tenantId,
        'wrap_up'
      );
    }

    // Record outcome for predictive dialer
    if (call.campaignId) {
      const campaign = this.activeCampaigns.get(call.campaignId);

      if (campaign && campaign.mode === 'predictive') {
        (campaign.dialer as PredictiveDialer).recordCallOutcome({
          answered: status === 'completed',
          abandoned: status === 'abandoned',
          talkTime: call.talkDuration || 0,
        });
      }
    }
  }

  /**
   * Start a campaign
   */
  async startCampaign(campaignId: string): Promise<void> {
    if (this.activeCampaigns.has(campaignId)) {
      logger.warn({ campaignId }, 'Campaign already running');
      return;
    }

    // Get campaign details
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    if (campaign.status !== 'active') {
      throw new Error(`Campaign ${campaignId} is not active`);
    }

    const dialMode = campaign.dialMode as DialMode;

    logger.info({ campaignId, dialMode }, 'Starting campaign');

    let dialer: PredictiveDialer | ProgressiveDialer | PreviewDialer;

    // Create appropriate dialer
    switch (dialMode) {
      case 'predictive':
        const predictiveConfig: PredictiveDialerConfig = {
          campaignId,
          tenantId: campaign.tenantId,
          maxDialRatio: campaign.settings.dialRatio || 2.5,
          minDialRatio: 1.2,
          abandonRateTarget: 0.03,
          answerRate: 0.25,
          avgTalkTime: 180,
          avgWrapTime: campaign.settings.wrapUpTime || 30,
          adjustmentInterval: 30000,
          callTimeout: campaign.settings.ringTimeout || 30,
        };
        dialer = new PredictiveDialer(predictiveConfig, this.fsCommands, this.callService);
        break;

      case 'progressive':
        const progressiveConfig: ProgressiveDialerConfig = {
          campaignId,
          tenantId: campaign.tenantId,
          callsPerAgent: 1,
          callTimeout: campaign.settings.ringTimeout || 30,
          agentWaitTime: 10,
        };
        dialer = new ProgressiveDialer(progressiveConfig, this.fsCommands, this.callService);
        break;

      case 'preview':
        const previewConfig: PreviewDialerConfig = {
          campaignId,
          tenantId: campaign.tenantId,
          previewTime: 30,
          callTimeout: campaign.settings.ringTimeout || 30,
          autoDialAfterPreview: false,
        };
        dialer = new PreviewDialer(previewConfig, this.fsCommands, this.callService);
        break;

      default:
        throw new Error(`Unsupported dial mode: ${dialMode}`);
    }

    // Set up dialer event handlers
    this.setupDialerEventHandlers(dialer, campaignId, campaign.tenantId);

    // Store and start dialer
    this.activeCampaigns.set(campaignId, { dialer, mode: dialMode });
    await dialer.start();

    logger.info({ campaignId, dialMode }, 'Campaign started');
  }

  /**
   * Stop a campaign
   */
  async stopCampaign(campaignId: string): Promise<void> {
    const campaign = this.activeCampaigns.get(campaignId);

    if (!campaign) {
      logger.warn({ campaignId }, 'Campaign not running');
      return;
    }

    logger.info({ campaignId }, 'Stopping campaign');

    await campaign.dialer.stop();
    this.activeCampaigns.delete(campaignId);

    logger.info({ campaignId }, 'Campaign stopped');
  }

  /**
   * Set up dialer event handlers
   */
  private setupDialerEventHandlers(
    dialer: PredictiveDialer | ProgressiveDialer | PreviewDialer,
    campaignId: string,
    tenantId: string
  ): void {
    // Call initiated
    dialer.on('call-initiated', async (data) => {
      logger.info({ campaignId, ...data }, 'Call initiated');

      const call = await this.callService.getCall(data.callId);

      if (call) {
        await this.publishEvent<CallStartedEvent>(TOPICS.CALLS_STARTED, {
          eventId: uuidv4(),
          tenantId,
          timestamp: new Date().toISOString(),
          version: '1.0',
          type: 'calls.started',
          payload: {
            callId: data.callId,
            direction: 'outbound',
            phoneNumber: data.phoneNumber,
            campaignId,
            leadId: data.leadId,
            agentId: data.agentId,
          },
        });
      }
    });

    // Call failed
    dialer.on('call-failed', (data) => {
      logger.error({ campaignId, ...data }, 'Call failed');
    });

    // No leads available
    dialer.on('no-leads-available', () => {
      logger.warn({ campaignId }, 'No leads available for campaign');
    });
  }

  /**
   * Publish event to Kafka
   */
  private async publishEvent<T>(topic: string, event: T): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: (event as any).payload.callId || (event as any).eventId,
            value: JSON.stringify(event),
            timestamp: new Date().getTime().toString(),
          },
        ],
      });

      logger.debug({ topic, eventId: (event as any).eventId }, 'Event published');
    } catch (error) {
      logger.error({ error, topic }, 'Error publishing event');
    }
  }

  /**
   * Get campaign status
   */
  getCampaignStatus(campaignId: string): any | null {
    const campaign = this.activeCampaigns.get(campaignId);

    if (!campaign) {
      return null;
    }

    return {
      campaignId,
      mode: campaign.mode,
      metrics: campaign.dialer.getMetrics(),
      isRunning: true,
    };
  }

  /**
   * Get all active campaigns
   */
  getActiveCampaigns(): string[] {
    return Array.from(this.activeCampaigns.keys());
  }

  /**
   * Preview dialer: Request next lead
   */
  async requestNextLead(campaignId: string, agentId: string): Promise<any> {
    const campaign = this.activeCampaigns.get(campaignId);

    if (!campaign || campaign.mode !== 'preview') {
      throw new Error('Campaign not running in preview mode');
    }

    return (campaign.dialer as PreviewDialer).requestNextLead(agentId);
  }

  /**
   * Preview dialer: Accept preview
   */
  async acceptPreview(campaignId: string, previewId: string): Promise<void> {
    const campaign = this.activeCampaigns.get(campaignId);

    if (!campaign || campaign.mode !== 'preview') {
      throw new Error('Campaign not running in preview mode');
    }

    return (campaign.dialer as PreviewDialer).acceptPreview(previewId);
  }

  /**
   * Preview dialer: Reject preview
   */
  async rejectPreview(campaignId: string, previewId: string, reason?: string): Promise<void> {
    const campaign = this.activeCampaigns.get(campaignId);

    if (!campaign || campaign.mode !== 'preview') {
      throw new Error('Campaign not running in preview mode');
    }

    return (campaign.dialer as PreviewDialer).rejectPreview(previewId, reason);
  }

  /**
   * Preview dialer: Skip preview
   */
  async skipPreview(campaignId: string, previewId: string): Promise<void> {
    const campaign = this.activeCampaigns.get(campaignId);

    if (!campaign || campaign.mode !== 'preview') {
      throw new Error('Campaign not running in preview mode');
    }

    return (campaign.dialer as PreviewDialer).skipPreview(previewId);
  }

  /**
   * Shutdown the dialer manager
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down dialer manager');

    // Stop all campaigns
    for (const campaignId of this.activeCampaigns.keys()) {
      await this.stopCampaign(campaignId);
    }

    // Disconnect from FreeSWITCH
    this.fsClient.disconnect();

    // Disconnect from Kafka
    await this.producer.disconnect();

    // Close Redis
    await this.callService.close();

    logger.info('Dialer manager shutdown complete');
  }
}
