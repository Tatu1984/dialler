import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { db } from '@nexusdialer/database';
import { calls, type NewCall } from '@nexusdialer/database/schema';
import { eq } from 'drizzle-orm';

const logger = pino({ name: 'call-service' });

export interface CallState {
  id: string;
  tenantId: string;
  campaignId?: string;
  leadId?: string;
  agentId?: string;
  direction: 'inbound' | 'outbound';
  status: string;
  phoneNumber: string;
  callerId?: string;
  sipCallId?: string;
  freeswitchUuid?: string;
  startTime: string;
  answerTime?: string;
  endTime?: string;
  ringDuration?: number;
  talkDuration?: number;
  metadata: Record<string, any>;
}

export interface AgentStatus {
  agentId: string;
  tenantId: string;
  state: 'available' | 'on_call' | 'wrap_up' | 'break' | 'offline';
  currentCallId?: string;
  lastStateChange: string;
  totalCalls: number;
  availableTime: number; // seconds
  onCallTime: number; // seconds
  wrapUpTime: number; // seconds
}

export class CallService {
  private redis: Redis;
  private readonly CALL_KEY_PREFIX = 'call:';
  private readonly AGENT_KEY_PREFIX = 'agent:';
  private readonly CAMPAIGN_CALLS_KEY_PREFIX = 'campaign:calls:';
  private readonly ACTIVE_CALLS_KEY = 'calls:active';
  private readonly AGENT_CALLS_INDEX = 'index:agent:calls:';

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);

    this.redis.on('error', (error) => {
      logger.error({ error }, 'Redis connection error');
    });

    this.redis.on('connect', () => {
      logger.info('Connected to Redis');
    });
  }

  /**
   * Create a new call in Redis and database
   */
  async createCall(data: {
    tenantId: string;
    campaignId?: string;
    leadId?: string;
    phoneNumber: string;
    callerId?: string;
    direction: 'inbound' | 'outbound';
    metadata?: Record<string, any>;
  }): Promise<CallState> {
    const callId = uuidv4();
    const now = new Date().toISOString();

    const callState: CallState = {
      id: callId,
      tenantId: data.tenantId,
      campaignId: data.campaignId,
      leadId: data.leadId,
      direction: data.direction,
      status: 'initiated',
      phoneNumber: data.phoneNumber,
      callerId: data.callerId,
      startTime: now,
      metadata: data.metadata || {},
    };

    // Store in Redis
    const callKey = `${this.CALL_KEY_PREFIX}${callId}`;
    await this.redis.setex(callKey, 86400, JSON.stringify(callState)); // 24h TTL

    // Add to active calls set
    await this.redis.sadd(this.ACTIVE_CALLS_KEY, callId);

    // Add to campaign calls if campaign exists
    if (data.campaignId) {
      const campaignKey = `${this.CAMPAIGN_CALLS_KEY_PREFIX}${data.campaignId}`;
      await this.redis.sadd(campaignKey, callId);
    }

    logger.info(
      { callId, phoneNumber: data.phoneNumber, direction: data.direction },
      'Call created'
    );

    return callState;
  }

  /**
   * Update call state
   */
  async updateCall(callId: string, updates: Partial<CallState>): Promise<CallState | null> {
    const callKey = `${this.CALL_KEY_PREFIX}${callId}`;
    const existingData = await this.redis.get(callKey);

    if (!existingData) {
      logger.warn({ callId }, 'Call not found for update');
      return null;
    }

    const callState: CallState = {
      ...JSON.parse(existingData),
      ...updates,
    };

    await this.redis.setex(callKey, 86400, JSON.stringify(callState));

    logger.debug({ callId, updates }, 'Call updated');

    return callState;
  }

  /**
   * Get call by ID
   */
  async getCall(callId: string): Promise<CallState | null> {
    const callKey = `${this.CALL_KEY_PREFIX}${callId}`;
    const data = await this.redis.get(callKey);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  /**
   * Mark call as answered
   */
  async answerCall(callId: string, agentId?: string): Promise<CallState | null> {
    const call = await this.getCall(callId);

    if (!call) {
      logger.warn({ callId }, 'Call not found');
      return null;
    }

    const answerTime = new Date();
    const ringDuration = Math.floor(
      (answerTime.getTime() - new Date(call.startTime).getTime()) / 1000
    );

    const updates: Partial<CallState> = {
      status: 'answered',
      answerTime: answerTime.toISOString(),
      ringDuration,
      agentId,
    };

    const updatedCall = await this.updateCall(callId, updates);

    // Index by agent if provided
    if (agentId) {
      await this.redis.sadd(`${this.AGENT_CALLS_INDEX}${agentId}`, callId);
    }

    logger.info({ callId, agentId, ringDuration }, 'Call answered');

    return updatedCall;
  }

  /**
   * End a call
   */
  async endCall(
    callId: string,
    status: 'completed' | 'abandoned' | 'failed' | 'no_answer' | 'busy'
  ): Promise<CallState | null> {
    const call = await this.getCall(callId);

    if (!call) {
      logger.warn({ callId }, 'Call not found');
      return null;
    }

    const endTime = new Date();
    const startTime = new Date(call.startTime);

    let talkDuration = 0;
    if (call.answerTime) {
      talkDuration = Math.floor((endTime.getTime() - new Date(call.answerTime).getTime()) / 1000);
    }

    const updates: Partial<CallState> = {
      status,
      endTime: endTime.toISOString(),
      talkDuration,
    };

    const updatedCall = await this.updateCall(callId, updates);

    // Remove from active calls
    await this.redis.srem(this.ACTIVE_CALLS_KEY, callId);

    // Persist to database
    await this.persistCallToDatabase(updatedCall!);

    logger.info({ callId, status, talkDuration }, 'Call ended');

    return updatedCall;
  }

  /**
   * Persist call to database
   */
  private async persistCallToDatabase(callState: CallState): Promise<void> {
    try {
      const newCall: NewCall = {
        id: callState.id,
        tenantId: callState.tenantId,
        campaignId: callState.campaignId,
        leadId: callState.leadId,
        agentId: callState.agentId,
        direction: callState.direction,
        status: callState.status,
        phoneNumber: callState.phoneNumber,
        callerId: callState.callerId,
        sipCallId: callState.sipCallId,
        startTime: new Date(callState.startTime),
        answerTime: callState.answerTime ? new Date(callState.answerTime) : null,
        endTime: callState.endTime ? new Date(callState.endTime) : null,
        ringDuration: callState.ringDuration,
        talkDuration: callState.talkDuration,
        metadata: callState.metadata,
      };

      await db.insert(calls).values(newCall);

      logger.info({ callId: callState.id }, 'Call persisted to database');
    } catch (error) {
      logger.error({ error, callId: callState.id }, 'Failed to persist call to database');
    }
  }

  /**
   * Get active calls for a campaign
   */
  async getCampaignActiveCalls(campaignId: string): Promise<CallState[]> {
    const campaignKey = `${this.CAMPAIGN_CALLS_KEY_PREFIX}${campaignId}`;
    const callIds = await this.redis.smembers(campaignKey);

    const calls = await Promise.all(
      callIds.map((callId) => this.getCall(callId))
    );

    return calls.filter((call): call is CallState => call !== null);
  }

  /**
   * Get all active calls
   */
  async getActiveCalls(): Promise<CallState[]> {
    const callIds = await this.redis.smembers(this.ACTIVE_CALLS_KEY);

    const calls = await Promise.all(
      callIds.map((callId) => this.getCall(callId))
    );

    return calls.filter((call): call is CallState => call !== null);
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(
    agentId: string,
    tenantId: string,
    state: AgentStatus['state'],
    currentCallId?: string
  ): Promise<void> {
    const agentKey = `${this.AGENT_KEY_PREFIX}${agentId}`;
    const existingData = await this.redis.get(agentKey);

    const now = new Date().toISOString();

    let agentStatus: AgentStatus;
    if (existingData) {
      agentStatus = JSON.parse(existingData);
      agentStatus.state = state;
      agentStatus.currentCallId = currentCallId;
      agentStatus.lastStateChange = now;
    } else {
      agentStatus = {
        agentId,
        tenantId,
        state,
        currentCallId,
        lastStateChange: now,
        totalCalls: 0,
        availableTime: 0,
        onCallTime: 0,
        wrapUpTime: 0,
      };
    }

    await this.redis.setex(agentKey, 86400, JSON.stringify(agentStatus));

    logger.info({ agentId, state }, 'Agent status updated');
  }

  /**
   * Get agent status
   */
  async getAgentStatus(agentId: string): Promise<AgentStatus | null> {
    const agentKey = `${this.AGENT_KEY_PREFIX}${agentId}`;
    const data = await this.redis.get(agentKey);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  /**
   * Get available agents for a tenant
   */
  async getAvailableAgents(tenantId: string): Promise<AgentStatus[]> {
    const pattern = `${this.AGENT_KEY_PREFIX}*`;
    const keys = await this.redis.keys(pattern);

    const agents = await Promise.all(
      keys.map(async (key) => {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      })
    );

    return agents.filter(
      (agent): agent is AgentStatus =>
        agent !== null &&
        agent.tenantId === tenantId &&
        agent.state === 'available'
    );
  }

  /**
   * Increment agent call count
   */
  async incrementAgentCallCount(agentId: string): Promise<void> {
    const agentKey = `${this.AGENT_KEY_PREFIX}${agentId}`;
    const data = await this.redis.get(agentKey);

    if (data) {
      const agentStatus: AgentStatus = JSON.parse(data);
      agentStatus.totalCalls++;
      await this.redis.setex(agentKey, 86400, JSON.stringify(agentStatus));
    }
  }

  /**
   * Get call count for a campaign
   */
  async getCampaignCallCount(campaignId: string): Promise<number> {
    const campaignKey = `${this.CAMPAIGN_CALLS_KEY_PREFIX}${campaignId}`;
    return await this.redis.scard(campaignKey);
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
    logger.info('Redis connection closed');
  }
}
