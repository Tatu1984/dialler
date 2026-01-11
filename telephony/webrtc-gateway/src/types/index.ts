import type { Socket } from 'socket.io';
import type { types as mediasoupTypes } from 'mediasoup';

// ============================================
// WebRTC Types
// ============================================

export interface RTCSessionDescription {
  type: 'offer' | 'answer';
  sdp: string;
}

export interface RTCIceCandidate {
  candidate: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
}

export interface WebRTCPeer {
  id: string;
  agentId: string;
  tenantId: string;
  socket: Socket;
  transport?: mediasoupTypes.WebRtcTransport;
  producer?: mediasoupTypes.Producer;
  consumer?: mediasoupTypes.Consumer;
  sipCallId?: string;
  callId?: string;
  createdAt: Date;
  lastActivity: Date;
}

export interface MediaServerConfig {
  listenIps: Array<{
    ip: string;
    announcedIp?: string;
  }>;
  initialAvailableOutgoingBitrate: number;
  minimumAvailableOutgoingBitrate: number;
  maxIncomingBitrate: number;
  maxSctpMessageSize: number;
}

export interface RouterCapabilities {
  codecs: mediasoup.types.RtpCodecCapability[];
  headerExtensions: mediasoup.types.RtpHeaderExtension[];
}

// ============================================
// SIP Types
// ============================================

export interface SIPConfig {
  uri: string;
  username: string;
  password: string;
  wsServer: string;
  displayName?: string;
  realm?: string;
  transportOptions?: {
    wsServers: string[];
    maxReconnectionAttempts?: number;
    reconnectionTimeout?: number;
  };
}

export interface SIPSession {
  id: string;
  agentId: string;
  tenantId: string;
  callId: string;
  direction: 'inbound' | 'outbound';
  remoteIdentity: string;
  localIdentity: string;
  state: 'initial' | 'establishing' | 'established' | 'terminating' | 'terminated';
  startTime: Date;
  endTime?: Date;
  holdState: boolean;
  muteState: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================
// Call Management Types
// ============================================

export interface CallSession {
  id: string;
  tenantId: string;
  agentId: string;
  callId: string;
  direction: 'inbound' | 'outbound';
  phoneNumber: string;
  state: CallState;
  webrtcPeerId: string;
  sipSessionId?: string;
  campaignId?: string;
  leadId?: string;
  queueId?: string;
  startTime: Date;
  answerTime?: Date;
  endTime?: Date;
  holdState: boolean;
  muteState: boolean;
  recordingEnabled: boolean;
  metadata?: Record<string, unknown>;
}

export type CallState =
  | 'initiating'
  | 'ringing'
  | 'answered'
  | 'on_hold'
  | 'transferring'
  | 'ending'
  | 'ended'
  | 'failed';

export interface CallTransferRequest {
  callId: string;
  targetType: 'agent' | 'queue' | 'external';
  targetId: string;
  transferType: 'warm' | 'cold' | 'blind';
}

export interface DTMFTone {
  tone: string;
  duration?: number;
}

// ============================================
// Socket Event Types
// ============================================

export interface WebRTCSocketEvents {
  // Client to Server
  'webrtc:offer': (data: {
    callId: string;
    sdp: RTCSessionDescription;
    callback: (response: WebRTCResponse) => void;
  }) => void;

  'webrtc:answer': (data: {
    callId: string;
    sdp: RTCSessionDescription;
    callback: (response: WebRTCResponse) => void;
  }) => void;

  'webrtc:ice-candidate': (data: {
    callId: string;
    candidate: RTCIceCandidate;
  }) => void;

  'webrtc:get-router-capabilities': (
    callback: (response: { success: boolean; capabilities?: RouterCapabilities }) => void
  ) => void;

  'webrtc:create-transport': (data: {
    direction: 'send' | 'receive';
    callback: (response: TransportResponse) => void;
  }) => void;

  'webrtc:connect-transport': (data: {
    transportId: string;
    dtlsParameters: mediasoup.types.DtlsParameters;
    callback: (response: WebRTCResponse) => void;
  }) => void;

  'webrtc:produce': (data: {
    transportId: string;
    kind: 'audio' | 'video';
    rtpParameters: mediasoup.types.RtpParameters;
    callback: (response: { success: boolean; producerId?: string; error?: string }) => void;
  }) => void;

  'webrtc:consume': (data: {
    transportId: string;
    producerId: string;
    rtpCapabilities: mediasoup.types.RtpCapabilities;
    callback: (response: ConsumeResponse) => void;
  }) => void;

  'call:dial': (data: {
    phoneNumber: string;
    leadId?: string;
    campaignId?: string;
    callback: (response: CallResponse) => void;
  }) => void;

  'call:answer': (data: {
    callId: string;
    callback: (response: CallResponse) => void;
  }) => void;

  'call:hangup': (data: {
    callId: string;
    callback: (response: WebRTCResponse) => void;
  }) => void;

  'call:hold': (data: {
    callId: string;
    callback: (response: WebRTCResponse) => void;
  }) => void;

  'call:unhold': (data: {
    callId: string;
    callback: (response: WebRTCResponse) => void;
  }) => void;

  'call:mute': (data: {
    callId: string;
    muted: boolean;
    callback: (response: WebRTCResponse) => void;
  }) => void;

  'call:transfer': (data: {
    callId: string;
    target: string;
    transferType: 'warm' | 'cold' | 'blind';
    callback: (response: WebRTCResponse) => void;
  }) => void;

  'call:dtmf': (data: {
    callId: string;
    tone: string;
    duration?: number;
    callback: (response: WebRTCResponse) => void;
  }) => void;

  // Server to Client
  'webrtc:peer-connected': (data: { peerId: string }) => void;
  'webrtc:peer-disconnected': (data: { peerId: string; reason?: string }) => void;
  'webrtc:remote-ice-candidate': (data: { callId: string; candidate: RTCIceCandidate }) => void;

  'call:incoming': (data: {
    callId: string;
    phoneNumber: string;
    callerId?: string;
    queueId?: string;
  }) => void;

  'call:ringing': (data: { callId: string }) => void;
  'call:answered': (data: { callId: string; timestamp: string }) => void;
  'call:ended': (data: { callId: string; reason?: string; duration?: number }) => void;
  'call:failed': (data: { callId: string; error: string }) => void;
  'call:held': (data: { callId: string; isOnHold: boolean }) => void;
  'call:muted': (data: { callId: string; isMuted: boolean }) => void;
  'call:transferred': (data: { callId: string; target: string }) => void;

  'error': (data: { code: string; message: string; details?: unknown }) => void;
}

// ============================================
// Response Types
// ============================================

export interface WebRTCResponse {
  success: boolean;
  error?: string;
  details?: unknown;
}

export interface CallResponse {
  success: boolean;
  callId?: string;
  error?: string;
  details?: unknown;
}

export interface TransportResponse {
  success: boolean;
  transportId?: string;
  iceParameters?: mediasoup.types.IceParameters;
  iceCandidates?: mediasoup.types.IceCandidate[];
  dtlsParameters?: mediasoup.types.DtlsParameters;
  error?: string;
}

export interface ConsumeResponse {
  success: boolean;
  consumerId?: string;
  producerId?: string;
  kind?: 'audio' | 'video';
  rtpParameters?: mediasoup.types.RtpParameters;
  error?: string;
}

// ============================================
// Statistics Types
// ============================================

export interface PeerStatistics {
  peerId: string;
  agentId: string;
  bytesReceived: number;
  bytesSent: number;
  packetsLost: number;
  packetsReceived: number;
  packetsSent: number;
  jitter: number;
  roundTripTime: number;
  audioLevel?: number;
  timestamp: Date;
}

export interface CallStatistics {
  callId: string;
  duration: number;
  audioCodec: string;
  bitrate: {
    incoming: number;
    outgoing: number;
  };
  packetLoss: {
    incoming: number;
    outgoing: number;
  };
  jitter: number;
  roundTripTime: number;
}

// ============================================
// Configuration Types
// ============================================

export interface WebRTCGatewayConfig {
  port: number;
  host: string;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  mediasoup: {
    numWorkers: number;
    worker: {
      rtcMinPort: number;
      rtcMaxPort: number;
      logLevel: 'debug' | 'warn' | 'error' | 'none';
      logTags: string[];
    };
    router: {
      mediaCodecs: mediasoup.types.RtpCodecCapability[];
    };
    webRtcTransport: {
      listenIps: Array<{
        ip: string;
        announcedIp?: string;
      }>;
      initialAvailableOutgoingBitrate: number;
      minimumAvailableOutgoingBitrate: number;
      maxIncomingBitrate: number;
      maxSctpMessageSize: number;
    };
  };
  freeswitch: {
    host: string;
    port: number;
    wsUrl: string;
    eslPassword: string;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
}

// ============================================
// Event Payload Types
// ============================================

export interface CallEventPayload {
  callId: string;
  agentId: string;
  tenantId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CallStartedPayload extends CallEventPayload {
  direction: 'inbound' | 'outbound';
  phoneNumber: string;
  callerId?: string;
  campaignId?: string;
  leadId?: string;
  queueId?: string;
}

export interface CallEndedPayload extends CallEventPayload {
  reason: string;
  duration: number;
  dispositionId?: string;
}

export interface CallTransferredPayload extends CallEventPayload {
  fromAgentId: string;
  toAgentId?: string;
  toQueueId?: string;
  toExternalNumber?: string;
  transferType: 'warm' | 'cold' | 'blind';
}

// ============================================
// Error Types
// ============================================

export class WebRTCError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'WebRTCError';
  }
}

export class SIPError extends Error {
  constructor(
    message: string,
    public code: string,
    public sipCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SIPError';
  }
}
