import { EventEmitter } from 'events';
import { FreeSwitchConnection } from './freeswitch-connection';
import type { Logger } from 'pino';

interface ActiveCall {
  uuid: string;
  campaignId: string;
  leadId: string;
  agentId?: string;
  destination: string;
  status: 'originating' | 'ringing' | 'answered' | 'connected' | 'held' | 'transferring';
  startTime: number;
  answerTime?: number;
  connectTime?: number;
  recordingPath?: string;
}

interface OriginateParams {
  campaignId: string;
  leadId: string;
  destination: string;
  callerId: string;
  callerIdName?: string;
  agentId?: string;
  timeout?: number;
}

export class CallManager extends EventEmitter {
  private fsConnection: FreeSwitchConnection;
  private logger: Logger;
  private activeCalls: Map<string, ActiveCall> = new Map();
  private callsByCampaign: Map<string, Set<string>> = new Map();

  constructor(fsConnection: FreeSwitchConnection, logger: Logger) {
    super();
    this.fsConnection = fsConnection;
    this.logger = logger.child({ component: 'CallManager' });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.fsConnection.on('channel:answer', (event) => {
      this.handleChannelAnswer(event);
    });

    this.fsConnection.on('channel:bridge', (event) => {
      this.handleChannelBridge(event);
    });

    this.fsConnection.on('channel:hangup', (event) => {
      this.handleChannelHangup(event);
    });
  }

  async originate(params: OriginateParams): Promise<string> {
    const result = await this.fsConnection.originate({
      destination: params.destination,
      callerId: params.callerId,
      callerIdName: params.callerIdName,
      campaignId: params.campaignId,
      leadId: params.leadId,
      agentId: params.agentId,
      timeout: params.timeout,
    });

    if (!result.success) {
      throw new Error(`Call failed: ${result.hangupCause}`);
    }

    const call: ActiveCall = {
      uuid: result.uuid,
      campaignId: params.campaignId,
      leadId: params.leadId,
      agentId: params.agentId,
      destination: params.destination,
      status: 'originating',
      startTime: Date.now(),
    };

    this.activeCalls.set(result.uuid, call);
    this.addToCampaignCalls(params.campaignId, result.uuid);

    this.logger.info({ uuid: result.uuid, destination: params.destination }, 'Call originated');
    this.emit('call:originating', { uuid: result.uuid, ...params });

    return result.uuid;
  }

  async hangup(uuid: string, cause?: string): Promise<void> {
    const call = this.activeCalls.get(uuid);
    if (!call) {
      throw new Error('Call not found');
    }

    await this.fsConnection.hangup(uuid, cause);
    this.logger.info({ uuid }, 'Call hangup requested');
  }

  async hold(uuid: string): Promise<void> {
    const call = this.activeCalls.get(uuid);
    if (!call) {
      throw new Error('Call not found');
    }

    await this.fsConnection.hold(uuid);
    call.status = 'held';
    this.emit('call:held', { uuid, campaignId: call.campaignId });
  }

  async unhold(uuid: string): Promise<void> {
    const call = this.activeCalls.get(uuid);
    if (!call) {
      throw new Error('Call not found');
    }

    await this.fsConnection.unhold(uuid);
    call.status = 'connected';
    this.emit('call:unheld', { uuid, campaignId: call.campaignId });
  }

  async transfer(uuid: string, destination: string): Promise<void> {
    const call = this.activeCalls.get(uuid);
    if (!call) {
      throw new Error('Call not found');
    }

    call.status = 'transferring';
    await this.fsConnection.transfer(uuid, destination);
    this.logger.info({ uuid, destination }, 'Call transfer initiated');
    this.emit('call:transferring', { uuid, destination, campaignId: call.campaignId });
  }

  async blindTransfer(uuid: string, destination: string): Promise<void> {
    await this.transfer(uuid, destination);
  }

  async warmTransfer(uuid: string, destination: string): Promise<string> {
    const call = this.activeCalls.get(uuid);
    if (!call) {
      throw new Error('Call not found');
    }

    // Hold current call
    await this.hold(uuid);

    // Originate to new destination
    const consultUuid = await this.originate({
      campaignId: call.campaignId,
      leadId: call.leadId,
      destination,
      callerId: call.destination, // Use the original destination as caller ID
    });

    return consultUuid;
  }

  async completeWarmTransfer(originalUuid: string, consultUuid: string): Promise<void> {
    // Bridge the original caller with the transfer destination
    await this.fsConnection.bridge(originalUuid, consultUuid);
    this.logger.info({ originalUuid, consultUuid }, 'Warm transfer completed');
  }

  async startRecording(uuid: string): Promise<string> {
    const call = this.activeCalls.get(uuid);
    if (!call) {
      throw new Error('Call not found');
    }

    const recordingPath = `/var/lib/freeswitch/recordings/${uuid}.wav`;
    await this.fsConnection.startRecording(uuid, recordingPath);
    call.recordingPath = recordingPath;

    this.emit('call:recording:started', { uuid, path: recordingPath });
    return recordingPath;
  }

  async stopRecording(uuid: string): Promise<void> {
    const call = this.activeCalls.get(uuid);
    if (!call) {
      throw new Error('Call not found');
    }

    await this.fsConnection.stopRecording(uuid);
    this.emit('call:recording:stopped', { uuid, path: call.recordingPath });
  }

  async playAudio(uuid: string, file: string): Promise<void> {
    await this.fsConnection.playAudio(uuid, file);
  }

  private handleChannelAnswer(event: any): void {
    const call = this.activeCalls.get(event.uuid);
    if (!call) return;

    call.status = 'answered';
    call.answerTime = Date.now();

    this.logger.info({ uuid: event.uuid }, 'Call answered');
    this.emit('call:answered', {
      uuid: event.uuid,
      campaignId: call.campaignId,
      leadId: call.leadId,
      agentId: call.agentId,
    });
  }

  private handleChannelBridge(event: any): void {
    const call = this.activeCalls.get(event.uuid);
    if (!call) return;

    call.status = 'connected';
    call.connectTime = Date.now();

    this.logger.info({ uuid: event.uuid }, 'Call bridged to agent');
    this.emit('call:connected', {
      uuid: event.uuid,
      campaignId: call.campaignId,
      leadId: call.leadId,
      agentId: call.agentId,
    });
  }

  private handleChannelHangup(event: any): void {
    const call = this.activeCalls.get(event.uuid);
    if (!call) return;

    const duration = call.answerTime
      ? Math.floor((Date.now() - call.answerTime) / 1000)
      : 0;

    this.logger.info({
      uuid: event.uuid,
      cause: event.hangupCause,
      duration
    }, 'Call ended');

    this.emit('call:hangup', {
      uuid: event.uuid,
      campaignId: call.campaignId,
      leadId: call.leadId,
      agentId: call.agentId,
      hangupCause: event.hangupCause,
      duration,
    });

    // Clean up
    this.activeCalls.delete(event.uuid);
    this.removeFromCampaignCalls(call.campaignId, event.uuid);
  }

  private addToCampaignCalls(campaignId: string, uuid: string): void {
    if (!this.callsByCampaign.has(campaignId)) {
      this.callsByCampaign.set(campaignId, new Set());
    }
    this.callsByCampaign.get(campaignId)!.add(uuid);
  }

  private removeFromCampaignCalls(campaignId: string, uuid: string): void {
    this.callsByCampaign.get(campaignId)?.delete(uuid);
  }

  getActiveCalls(campaignId?: string): ActiveCall[] {
    if (campaignId) {
      const uuids = this.callsByCampaign.get(campaignId) || new Set();
      return Array.from(uuids)
        .map(uuid => this.activeCalls.get(uuid))
        .filter(Boolean) as ActiveCall[];
    }
    return Array.from(this.activeCalls.values());
  }

  getCall(uuid: string): ActiveCall | undefined {
    return this.activeCalls.get(uuid);
  }

  getCallCount(campaignId?: string): number {
    if (campaignId) {
      return this.callsByCampaign.get(campaignId)?.size || 0;
    }
    return this.activeCalls.size;
  }
}
