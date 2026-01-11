import type { Socket } from 'socket.io';
import { createLogger } from '../utils/logger';
import { peerManager } from '../webrtc/peer-manager';
import { mediaServer } from '../webrtc/media-server';
import { sipGateway } from '../sip/gateway';
import type {
  WebRTCResponse,
  CallResponse,
  TransportResponse,
  ConsumeResponse,
} from '../types';
import type { types as mediasoupTypes } from 'mediasoup';

type DtlsParameters = mediasoupTypes.DtlsParameters;
type RtpParameters = mediasoupTypes.RtpParameters;
type RtpCapabilities = mediasoupTypes.RtpCapabilities;

const logger = createLogger('call-handlers');

export function registerCallHandlers(socket: Socket): void {
  const agentId = (socket.data as any).agentId;
  const tenantId = (socket.data as any).tenantId;
  const userId = (socket.data as any).userId;

  if (!agentId || !tenantId) {
    logger.error({ socketId: socket.id }, 'Missing agentId or tenantId in socket data');
    socket.emit('error', {
      code: 'MISSING_CREDENTIALS',
      message: 'Missing agent credentials',
    });
    socket.disconnect();
    return;
  }

  logger.info(
    {
      socketId: socket.id,
      agentId,
      tenantId,
      userId,
    },
    'Registering call handlers'
  );

  // Create WebRTC peer for this agent
  const peer = peerManager.createPeer(socket, agentId, tenantId);

  // Emit peer connected event
  socket.emit('webrtc:peer-connected', { peerId: peer.id });

  // ============================================
  // WebRTC Handlers
  // ============================================

  socket.on(
    'webrtc:get-router-capabilities',
    async (callback: (response: { success: boolean; capabilities?: any }) => void) => {
      try {
        const capabilities = await mediaServer.getRouterCapabilities(tenantId);
        callback({ success: true, capabilities });
      } catch (error) {
        logger.error({ error, agentId, tenantId }, 'Failed to get router capabilities');
        callback({ success: false });
      }
    }
  );

  socket.on(
    'webrtc:create-transport',
    async (
      data: { direction: 'send' | 'receive' },
      callback: (response: TransportResponse) => void
    ) => {
      try {
        const response = await peerManager.createTransport(peer.id, data.direction);
        callback(response);
      } catch (error) {
        logger.error({ error, agentId, direction: data.direction }, 'Failed to create transport');
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  socket.on(
    'webrtc:connect-transport',
    async (
      data: { transportId: string; dtlsParameters: DtlsParameters },
      callback: (response: WebRTCResponse) => void
    ) => {
      try {
        const response = await peerManager.connectTransport(
          peer.id,
          data.transportId,
          data.dtlsParameters
        );
        callback(response);
      } catch (error) {
        logger.error({ error, agentId, transportId: data.transportId }, 'Failed to connect transport');
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  socket.on(
    'webrtc:produce',
    async (
      data: {
        transportId: string;
        kind: 'audio' | 'video';
        rtpParameters: RtpParameters;
      },
      callback: (response: { success: boolean; producerId?: string; error?: string }) => void
    ) => {
      try {
        const response = await peerManager.produce(
          peer.id,
          data.transportId,
          data.kind,
          data.rtpParameters
        );
        callback(response);
      } catch (error) {
        logger.error({ error, agentId, transportId: data.transportId }, 'Failed to produce');
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  socket.on(
    'webrtc:consume',
    async (
      data: {
        transportId: string;
        producerId: string;
        rtpCapabilities: RtpCapabilities;
      },
      callback: (response: ConsumeResponse) => void
    ) => {
      try {
        const response = await peerManager.consume(
          peer.id,
          data.transportId,
          data.producerId,
          data.rtpCapabilities
        );
        callback(response);
      } catch (error) {
        logger.error({ error, agentId, transportId: data.transportId }, 'Failed to consume');
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // ============================================
  // Call Control Handlers
  // ============================================

  socket.on(
    'call:dial',
    async (
      data: {
        phoneNumber: string;
        leadId?: string;
        campaignId?: string;
      },
      callback: (response: CallResponse) => void
    ) => {
      try {
        logger.info(
          {
            agentId,
            phoneNumber: data.phoneNumber,
            leadId: data.leadId,
            campaignId: data.campaignId,
          },
          'Initiating outbound call'
        );

        // Create call session
        const callSession = peerManager.createCallSession(
          peer.id,
          data.phoneNumber,
          'outbound',
          {
            campaignId: data.campaignId,
            leadId: data.leadId,
          }
        );

        // Initiate SIP call
        const sipSessionId = await sipGateway.makeCall(
          agentId,
          tenantId,
          callSession.callId,
          data.phoneNumber
        );

        peerManager.setSIPSessionId(callSession.callId, sipSessionId);

        // Emit ringing event
        socket.emit('call:ringing', { callId: callSession.callId });

        callback({
          success: true,
          callId: callSession.callId,
        });
      } catch (error) {
        logger.error({ error, agentId, phoneNumber: data.phoneNumber }, 'Failed to dial');
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  socket.on(
    'call:answer',
    async (
      data: { callId: string },
      callback: (response: CallResponse) => void
    ) => {
      try {
        const callSession = peerManager.getCallSession(data.callId);
        if (!callSession) {
          throw new Error('Call session not found');
        }

        if (!callSession.sipSessionId) {
          throw new Error('SIP session not found');
        }

        await sipGateway.answerCall(callSession.sipSessionId);
        peerManager.updateCallState(data.callId, 'answered');

        socket.emit('call:answered', {
          callId: data.callId,
          timestamp: new Date().toISOString(),
        });

        callback({ success: true, callId: data.callId });

        logger.info({ agentId, callId: data.callId }, 'Call answered');
      } catch (error) {
        logger.error({ error, agentId, callId: data.callId }, 'Failed to answer call');
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  socket.on(
    'call:hangup',
    async (
      data: { callId: string },
      callback: (response: WebRTCResponse) => void
    ) => {
      try {
        const callSession = peerManager.getCallSession(data.callId);
        if (!callSession) {
          throw new Error('Call session not found');
        }

        if (callSession.sipSessionId) {
          await sipGateway.hangup(callSession.sipSessionId);
        }

        const duration = callSession.answerTime
          ? (new Date().getTime() - callSession.answerTime.getTime()) / 1000
          : 0;

        peerManager.endCallSession(data.callId);

        socket.emit('call:ended', {
          callId: data.callId,
          reason: 'hangup',
          duration,
        });

        callback({ success: true });

        logger.info({ agentId, callId: data.callId, duration }, 'Call ended');
      } catch (error) {
        logger.error({ error, agentId, callId: data.callId }, 'Failed to hangup call');
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  socket.on(
    'call:hold',
    async (
      data: { callId: string },
      callback: (response: WebRTCResponse) => void
    ) => {
      try {
        const callSession = peerManager.getCallSession(data.callId);
        if (!callSession) {
          throw new Error('Call session not found');
        }

        if (!callSession.sipSessionId) {
          throw new Error('SIP session not found');
        }

        await sipGateway.hold(callSession.sipSessionId);
        peerManager.setCallHoldState(data.callId, true);

        socket.emit('call:held', { callId: data.callId, isOnHold: true });

        callback({ success: true });

        logger.info({ agentId, callId: data.callId }, 'Call placed on hold');
      } catch (error) {
        logger.error({ error, agentId, callId: data.callId }, 'Failed to hold call');
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  socket.on(
    'call:unhold',
    async (
      data: { callId: string },
      callback: (response: WebRTCResponse) => void
    ) => {
      try {
        const callSession = peerManager.getCallSession(data.callId);
        if (!callSession) {
          throw new Error('Call session not found');
        }

        if (!callSession.sipSessionId) {
          throw new Error('SIP session not found');
        }

        await sipGateway.unhold(callSession.sipSessionId);
        peerManager.setCallHoldState(data.callId, false);

        socket.emit('call:held', { callId: data.callId, isOnHold: false });

        callback({ success: true });

        logger.info({ agentId, callId: data.callId }, 'Call resumed from hold');
      } catch (error) {
        logger.error({ error, agentId, callId: data.callId }, 'Failed to unhold call');
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  socket.on(
    'call:mute',
    async (
      data: { callId: string; muted: boolean },
      callback: (response: WebRTCResponse) => void
    ) => {
      try {
        peerManager.setCallMuteState(data.callId, data.muted);

        socket.emit('call:muted', { callId: data.callId, isMuted: data.muted });

        callback({ success: true });

        logger.debug({ agentId, callId: data.callId, muted: data.muted }, 'Call mute state changed');
      } catch (error) {
        logger.error({ error, agentId, callId: data.callId }, 'Failed to mute/unmute call');
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  socket.on(
    'call:transfer',
    async (
      data: {
        callId: string;
        target: string;
        transferType: 'warm' | 'cold' | 'blind';
      },
      callback: (response: WebRTCResponse) => void
    ) => {
      try {
        const callSession = peerManager.getCallSession(data.callId);
        if (!callSession) {
          throw new Error('Call session not found');
        }

        if (!callSession.sipSessionId) {
          throw new Error('SIP session not found');
        }

        // Convert transfer type to SIP type
        const sipTransferType = data.transferType === 'warm' ? 'attended' : 'blind';

        await sipGateway.transfer(
          callSession.sipSessionId,
          data.target,
          sipTransferType
        );

        peerManager.updateCallState(data.callId, 'transferring');

        socket.emit('call:transferred', {
          callId: data.callId,
          target: data.target,
        });

        callback({ success: true });

        logger.info(
          {
            agentId,
            callId: data.callId,
            target: data.target,
            transferType: data.transferType,
          },
          'Call transferred'
        );
      } catch (error) {
        logger.error({ error, agentId, callId: data.callId }, 'Failed to transfer call');
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  socket.on(
    'call:dtmf',
    async (
      data: {
        callId: string;
        tone: string;
        duration?: number;
      },
      callback: (response: WebRTCResponse) => void
    ) => {
      try {
        const callSession = peerManager.getCallSession(data.callId);
        if (!callSession) {
          throw new Error('Call session not found');
        }

        if (!callSession.sipSessionId) {
          throw new Error('SIP session not found');
        }

        await sipGateway.sendDTMF(
          callSession.sipSessionId,
          data.tone,
          data.duration
        );

        callback({ success: true });

        logger.debug(
          {
            agentId,
            callId: data.callId,
            tone: data.tone,
          },
          'DTMF tone sent'
        );
      } catch (error) {
        logger.error({ error, agentId, callId: data.callId }, 'Failed to send DTMF');
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // ============================================
  // SIP Event Listeners
  // ============================================

  const handleSessionCreated = (sipSession: any) => {
    if (sipSession.agentId === agentId && sipSession.direction === 'inbound') {
      socket.emit('call:incoming', {
        callId: sipSession.callId,
        phoneNumber: sipSession.remoteIdentity,
      });

      // Create call session in peer manager
      const callSession = peerManager.createCallSession(
        peer.id,
        sipSession.remoteIdentity,
        'inbound'
      );

      peerManager.setSIPSessionId(callSession.callId, sipSession.id);

      logger.info(
        {
          agentId,
          callId: sipSession.callId,
          phoneNumber: sipSession.remoteIdentity,
        },
        'Incoming call notification sent'
      );
    }
  };

  const handleSessionTerminated = (sessionId: string, reason?: string) => {
    const sipSession = sipGateway.getSession(sessionId);
    if (sipSession && sipSession.agentId === agentId) {
      const callSession = peerManager.getCallSessionByPeer(peer.id);
      if (callSession && callSession.sipSessionId === sessionId) {
        const duration = callSession.answerTime
          ? (new Date().getTime() - callSession.answerTime.getTime()) / 1000
          : 0;

        peerManager.endCallSession(callSession.callId);

        socket.emit('call:ended', {
          callId: callSession.callId,
          reason: reason || 'terminated',
          duration,
        });
      }
    }
  };

  const handleCallRinging = (sessionId: string) => {
    const sipSession = sipGateway.getSession(sessionId);
    if (sipSession && sipSession.agentId === agentId) {
      const callSession = peerManager.getCallSession(sipSession.callId);
      if (callSession) {
        peerManager.updateCallState(callSession.callId, 'ringing');
        socket.emit('call:ringing', { callId: callSession.callId });
      }
    }
  };

  const handleCallAnswered = (sessionId: string) => {
    const sipSession = sipGateway.getSession(sessionId);
    if (sipSession && sipSession.agentId === agentId) {
      const callSession = peerManager.getCallSession(sipSession.callId);
      if (callSession) {
        peerManager.updateCallState(callSession.callId, 'answered');
        socket.emit('call:answered', {
          callId: callSession.callId,
          timestamp: new Date().toISOString(),
        });
      }
    }
  };

  sipGateway.on('session:created', handleSessionCreated);
  sipGateway.on('session:terminated', handleSessionTerminated);
  sipGateway.on('call:ringing', handleCallRinging);
  sipGateway.on('call:answered', handleCallAnswered);

  // ============================================
  // Disconnect Handler
  // ============================================

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id, agentId }, 'Socket disconnected');

    // Remove SIP event listeners
    sipGateway.off('session:created', handleSessionCreated);
    sipGateway.off('session:terminated', handleSessionTerminated);
    sipGateway.off('call:ringing', handleCallRinging);
    sipGateway.off('call:answered', handleCallAnswered);

    // Clean up peer
    peerManager.removePeer(peer.id);
  });
}
