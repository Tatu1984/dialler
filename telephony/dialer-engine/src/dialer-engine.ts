import { EventEmitter } from 'events';
import { CampaignManager } from './campaign-manager';
import { CallManager } from './call-manager';
import Redis from 'ioredis';
import type { Logger } from 'pino';

interface DialerConfig {
  redisUrl?: string;
  metricsInterval?: number;
}

export class DialerEngine extends EventEmitter {
  private campaignManager: CampaignManager;
  private callManager: CallManager;
  private logger: Logger;
  private redis: Redis | null = null;
  private config: DialerConfig;
  private metricsTimer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    campaignManager: CampaignManager,
    callManager: CallManager,
    logger: Logger,
    config: DialerConfig = {}
  ) {
    super();
    this.campaignManager = campaignManager;
    this.callManager = callManager;
    this.logger = logger.child({ component: 'DialerEngine' });
    this.config = {
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      metricsInterval: 5000,
      ...config,
    };
  }

  async start(): Promise<void> {
    this.logger.info('Starting dialer engine...');

    // Connect to Redis for pub/sub and caching
    this.redis = new Redis(this.config.redisUrl!);

    await this.redis.ping();
    this.logger.info('Connected to Redis');

    // Subscribe to campaign control commands
    await this.subscribeToCommands();

    // Start metrics publishing
    this.startMetricsPublishing();

    // Set up event forwarding
    this.setupEventForwarding();

    this.running = true;
    this.logger.info('Dialer engine started');
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping dialer engine...');
    this.running = false;

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }

    this.logger.info('Dialer engine stopped');
  }

  private async subscribeToCommands(): Promise<void> {
    if (!this.redis) return;

    const subscriber = this.redis.duplicate();
    await subscriber.subscribe('dialer:commands');

    subscriber.on('message', async (channel, message) => {
      try {
        const command = JSON.parse(message);
        await this.handleCommand(command);
      } catch (error) {
        this.logger.error({ error, message }, 'Failed to handle command');
      }
    });
  }

  private async handleCommand(command: {
    type: string;
    campaignId: string;
    data?: any;
  }): Promise<void> {
    this.logger.info({ command }, 'Received command');

    switch (command.type) {
      case 'START_CAMPAIGN':
        await this.campaignManager.startCampaign(
          command.campaignId,
          command.data.campaign,
          command.data.leads,
          command.data.agents
        );
        break;

      case 'PAUSE_CAMPAIGN':
        await this.campaignManager.pauseCampaign(command.campaignId);
        break;

      case 'RESUME_CAMPAIGN':
        await this.campaignManager.resumeCampaign(command.campaignId);
        break;

      case 'STOP_CAMPAIGN':
        await this.campaignManager.stopCampaign(command.campaignId);
        break;

      case 'PREVIEW_DIAL':
        await this.campaignManager.previewDial(
          command.campaignId,
          command.data.agentId,
          command.data.leadId
        );
        break;

      case 'HANGUP':
        await this.callManager.hangup(command.data.uuid, command.data.cause);
        break;

      case 'HOLD':
        await this.callManager.hold(command.data.uuid);
        break;

      case 'UNHOLD':
        await this.callManager.unhold(command.data.uuid);
        break;

      case 'TRANSFER':
        await this.callManager.transfer(command.data.uuid, command.data.destination);
        break;

      case 'AGENT_STATUS':
        this.campaignManager.updateAgentStatus(
          command.campaignId,
          command.data.agentId,
          command.data.status
        );
        break;

      default:
        this.logger.warn({ type: command.type }, 'Unknown command type');
    }
  }

  private setupEventForwarding(): void {
    // Forward call events to Redis for real-time updates
    const events = [
      'call:originating',
      'call:answered',
      'call:connected',
      'call:hangup',
      'call:held',
      'call:unheld',
      'call:transferring',
      'call:recording:started',
      'call:recording:stopped',
      'agent:available',
      'campaign:stopped',
    ];

    for (const event of events) {
      this.callManager.on(event, (data) => {
        this.publishEvent(event, data);
      });

      this.campaignManager.on(event, (data) => {
        this.publishEvent(event, data);
      });
    }
  }

  private publishEvent(event: string, data: any): void {
    if (!this.redis) return;

    this.redis.publish('dialer:events', JSON.stringify({
      event,
      data,
      timestamp: Date.now(),
    }));
  }

  private startMetricsPublishing(): void {
    this.metricsTimer = setInterval(() => {
      this.publishMetrics();
    }, this.config.metricsInterval!);
  }

  private async publishMetrics(): Promise<void> {
    if (!this.redis) return;

    const activeCalls = this.callManager.getActiveCalls();

    const metrics = {
      totalActiveCalls: activeCalls.length,
      callsByStatus: this.groupCallsByStatus(activeCalls),
      timestamp: Date.now(),
    };

    await this.redis.set('dialer:metrics', JSON.stringify(metrics));
    await this.redis.publish('dialer:metrics', JSON.stringify(metrics));
  }

  private groupCallsByStatus(calls: any[]): Record<string, number> {
    return calls.reduce((acc, call) => {
      acc[call.status] = (acc[call.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // Public API for direct control
  async startCampaign(campaignId: string, campaign: any, leads: any[], agents: any[]): Promise<void> {
    await this.campaignManager.startCampaign(campaignId, campaign, leads, agents);
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    await this.campaignManager.pauseCampaign(campaignId);
  }

  async resumeCampaign(campaignId: string): Promise<void> {
    await this.campaignManager.resumeCampaign(campaignId);
  }

  async stopCampaign(campaignId: string): Promise<void> {
    await this.campaignManager.stopCampaign(campaignId);
  }

  getActiveCalls(campaignId?: string): any[] {
    return this.callManager.getActiveCalls(campaignId);
  }

  getCampaignStats(campaignId: string): any {
    return this.campaignManager.getCampaignStats(campaignId);
  }

  isRunning(): boolean {
    return this.running;
  }
}
