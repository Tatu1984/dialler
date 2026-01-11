import type { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { mediaServer } from './media-server';
import type {
  WebRTCPeer,
  CallSession,
  CallState,
  WebRTCResponse,
  TransportResponse,
} from '../types';
import type { types as mediasoupTypes } from 'mediasoup';

type DtlsParameters = mediasoupTypes.DtlsParameters;
type RtpParameters = mediasoupTypes.RtpParameters;
type RtpCapabilities = mediasoupTypes.RtpCapabilities;

const logger = createLogger('peer-manager');

export class PeerManager {
  private peers: Map<string, WebRTCPeer> = new Map();
  private callSessions: Map<string, CallSession> = new Map();
  private agentPeers: Map<string, string> = new Map(); // agentId -> peerId
  private socketPeers: Map<string, string> = new Map(); // socketId -> peerId

  createPeer(socket: Socket, agentId: string, tenantId: string): WebRTCPeer {
    const peerId = uuidv4();

    const peer: WebRTCPeer = {
      id: peerId,
      agentId,
      tenantId,
      socket,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.peers.set(peerId, peer);
    this.agentPeers.set(agentId, peerId);
    this.socketPeers.set(socket.id, peerId);

    logger.info(
      {
        peerId,
        agentId,
        tenantId,
        socketId: socket.id,
      },
      'Peer created'
    );

    return peer;
  }

  getPeer(peerId: string): WebRTCPeer | undefined {
    return this.peers.get(peerId);
  }

  getPeerByAgentId(agentId: string): WebRTCPeer | undefined {
    const peerId = this.agentPeers.get(agentId);
    return peerId ? this.peers.get(peerId) : undefined;
  }

  getPeerBySocketId(socketId: string): WebRTCPeer | undefined {
    const peerId = this.socketPeers.get(socketId);
    return peerId ? this.peers.get(peerId) : undefined;
  }

  updatePeerActivity(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.lastActivity = new Date();
    }
  }

  async createTransport(
    peerId: string,
    direction: 'send' | 'receive'
  ): Promise<TransportResponse> {
    try {
      const peer = this.peers.get(peerId);
      if (!peer) {
        throw new Error('Peer not found');
      }

      const { transport, params } = await mediaServer.createWebRtcTransport(
        peer.tenantId,
        peer.agentId
      );

      peer.transport = transport;
      this.updatePeerActivity(peerId);

      logger.info(
        {
          peerId,
          transportId: transport.id,
          direction,
        },
        'Transport created for peer'
      );

      return {
        success: true,
        transportId: params.id,
        iceParameters: params.iceParameters,
        iceCandidates: params.iceCandidates,
        dtlsParameters: params.dtlsParameters,
      };
    } catch (error) {
      logger.error({ error, peerId, direction }, 'Failed to create transport');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async connectTransport(
    peerId: string,
    transportId: string,
    dtlsParameters: DtlsParameters
  ): Promise<WebRTCResponse> {
    try {
      const peer = this.peers.get(peerId);
      if (!peer) {
        throw new Error('Peer not found');
      }

      await mediaServer.connectWebRtcTransport(transportId, dtlsParameters);
      this.updatePeerActivity(peerId);

      logger.info(
        {
          peerId,
          transportId,
        },
        'Transport connected'
      );

      return { success: true };
    } catch (error) {
      logger.error({ error, peerId, transportId }, 'Failed to connect transport');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async produce(
    peerId: string,
    transportId: string,
    kind: 'audio' | 'video',
    rtpParameters: RtpParameters
  ): Promise<{ success: boolean; producerId?: string; error?: string }> {
    try {
      const peer = this.peers.get(peerId);
      if (!peer) {
        throw new Error('Peer not found');
      }

      const producer = await mediaServer.createProducer(transportId, kind, rtpParameters);
      peer.producer = producer;
      this.updatePeerActivity(peerId);

      logger.info(
        {
          peerId,
          producerId: producer.id,
          kind,
        },
        'Producer created'
      );

      return {
        success: true,
        producerId: producer.id,
      };
    } catch (error) {
      logger.error({ error, peerId, transportId, kind }, 'Failed to create producer');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async consume(
    peerId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities
  ): Promise<{
    success: boolean;
    consumerId?: string;
    producerId?: string;
    kind?: 'audio' | 'video';
    rtpParameters?: RtpParameters;
    error?: string;
  }> {
    try {
      const peer = this.peers.get(peerId);
      if (!peer) {
        throw new Error('Peer not found');
      }

      const consumer = await mediaServer.createConsumer(
        transportId,
        producerId,
        rtpCapabilities
      );

      peer.consumer = consumer;
      this.updatePeerActivity(peerId);

      logger.info(
        {
          peerId,
          consumerId: consumer.id,
          producerId,
          kind: consumer.kind,
        },
        'Consumer created'
      );

      return {
        success: true,
        consumerId: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      };
    } catch (error) {
      logger.error({ error, peerId, transportId, producerId }, 'Failed to create consumer');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  createCallSession(
    peerId: string,
    phoneNumber: string,
    direction: 'inbound' | 'outbound',
    options?: {
      campaignId?: string;
      leadId?: string;
      queueId?: string;
    }
  ): CallSession {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error('Peer not found');
    }

    const callId = uuidv4();

    const session: CallSession = {
      id: callId,
      tenantId: peer.tenantId,
      agentId: peer.agentId,
      callId,
      direction,
      phoneNumber,
      state: 'initiating',
      webrtcPeerId: peerId,
      startTime: new Date(),
      holdState: false,
      muteState: false,
      recordingEnabled: true,
      ...options,
    };

    this.callSessions.set(callId, session);
    peer.callId = callId;

    logger.info(
      {
        callId,
        peerId,
        agentId: peer.agentId,
        phoneNumber,
        direction,
      },
      'Call session created'
    );

    return session;
  }

  getCallSession(callId: string): CallSession | undefined {
    return this.callSessions.get(callId);
  }

  getCallSessionByPeer(peerId: string): CallSession | undefined {
    const peer = this.peers.get(peerId);
    if (peer?.callId) {
      return this.callSessions.get(peer.callId);
    }
    return undefined;
  }

  updateCallState(callId: string, state: CallState): void {
    const session = this.callSessions.get(callId);
    if (session) {
      session.state = state;

      if (state === 'answered' && !session.answerTime) {
        session.answerTime = new Date();
      }

      if (state === 'ended' || state === 'failed') {
        session.endTime = new Date();
      }

      logger.debug(
        {
          callId,
          state,
          agentId: session.agentId,
        },
        'Call state updated'
      );
    }
  }

  setCallHoldState(callId: string, holdState: boolean): void {
    const session = this.callSessions.get(callId);
    if (session) {
      session.holdState = holdState;
      logger.debug({ callId, holdState }, 'Call hold state updated');
    }
  }

  setCallMuteState(callId: string, muteState: boolean): void {
    const session = this.callSessions.get(callId);
    if (session) {
      session.muteState = muteState;
      logger.debug({ callId, muteState }, 'Call mute state updated');
    }
  }

  setSIPSessionId(callId: string, sipSessionId: string): void {
    const session = this.callSessions.get(callId);
    if (session) {
      session.sipSessionId = sipSessionId;

      const peer = this.peers.get(session.webrtcPeerId);
      if (peer) {
        peer.sipCallId = sipSessionId;
      }

      logger.debug({ callId, sipSessionId }, 'SIP session ID set');
    }
  }

  endCallSession(callId: string): void {
    const session = this.callSessions.get(callId);
    if (session) {
      session.state = 'ended';
      session.endTime = new Date();

      const peer = this.peers.get(session.webrtcPeerId);
      if (peer) {
        peer.callId = undefined;
        peer.sipCallId = undefined;
      }

      this.callSessions.delete(callId);

      logger.info(
        {
          callId,
          agentId: session.agentId,
          duration:
            session.answerTime && session.endTime
              ? (session.endTime.getTime() - session.answerTime.getTime()) / 1000
              : 0,
        },
        'Call session ended'
      );
    }
  }

  removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);

    if (peer) {
      // Close active call if any
      if (peer.callId) {
        this.endCallSession(peer.callId);
      }

      // Close media resources
      if (peer.producer) {
        mediaServer.closeProducer(peer.producer.id);
      }

      if (peer.consumer) {
        mediaServer.closeConsumer(peer.consumer.id);
      }

      if (peer.transport) {
        mediaServer.closeTransport(peer.transport.id);
      }

      // Remove from maps
      this.peers.delete(peerId);
      this.agentPeers.delete(peer.agentId);
      this.socketPeers.delete(peer.socket.id);

      logger.info(
        {
          peerId,
          agentId: peer.agentId,
        },
        'Peer removed'
      );
    }
  }

  getActiveCalls(): CallSession[] {
    return Array.from(this.callSessions.values());
  }

  getActiveCallsForAgent(agentId: string): CallSession[] {
    return Array.from(this.callSessions.values()).filter(
      (session) => session.agentId === agentId
    );
  }

  getStats(): {
    peers: number;
    activeCalls: number;
    callsByState: Record<CallState, number>;
  } {
    const callsByState: Record<CallState, number> = {
      initiating: 0,
      ringing: 0,
      answered: 0,
      on_hold: 0,
      transferring: 0,
      ending: 0,
      ended: 0,
      failed: 0,
    };

    for (const session of this.callSessions.values()) {
      callsByState[session.state] = (callsByState[session.state] || 0) + 1;
    }

    return {
      peers: this.peers.size,
      activeCalls: this.callSessions.size,
      callsByState,
    };
  }

  cleanup(): void {
    logger.info('Cleaning up peer manager...');

    // End all active calls
    for (const session of this.callSessions.values()) {
      this.endCallSession(session.id);
    }

    // Remove all peers
    for (const peerId of this.peers.keys()) {
      this.removePeer(peerId);
    }

    logger.info('Peer manager cleaned up');
  }
}

export const peerManager = new PeerManager();
