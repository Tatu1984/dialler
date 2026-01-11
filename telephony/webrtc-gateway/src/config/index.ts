import type { WebRTCGatewayConfig } from '../types';

export const config: WebRTCGatewayConfig = {
  port: Number(process.env.PORT) || 3005,
  host: process.env.HOST || '0.0.0.0',

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },

  mediasoup: {
    // Number of mediasoup workers
    numWorkers: Number(process.env.MEDIASOUP_WORKERS) || 2,

    worker: {
      rtcMinPort: Number(process.env.RTC_MIN_PORT) || 10000,
      rtcMaxPort: Number(process.env.RTC_MAX_PORT) || 10100,
      logLevel: (process.env.MEDIASOUP_LOG_LEVEL as any) || 'warn',
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp',
      ],
    },

    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'audio',
          mimeType: 'audio/PCMU',
          clockRate: 8000,
          channels: 1,
        },
        {
          kind: 'audio',
          mimeType: 'audio/PCMA',
          clockRate: 8000,
          channels: 1,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
          },
        },
      ] as mediasoup.RtpCodecCapability[],
    },

    webRtcTransport: {
      listenIps: [
        {
          ip: process.env.WEBRTC_LISTEN_IP || '0.0.0.0',
          announcedIp: process.env.WEBRTC_ANNOUNCED_IP, // Public IP for remote clients
        },
      ],
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
      maxIncomingBitrate: 1500000,
      maxSctpMessageSize: 262144,
    },
  },

  freeswitch: {
    host: process.env.FREESWITCH_HOST || 'localhost',
    port: Number(process.env.FREESWITCH_PORT) || 5060,
    wsUrl: process.env.FREESWITCH_WS_URL || 'ws://localhost:8081',
    eslPassword: process.env.FREESWITCH_ESL_PASSWORD || 'ClueCon',
  },

  redis: process.env.REDIS_HOST
    ? {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      }
    : undefined,
};

// Validation
export function validateConfig(): void {
  const required = ['PORT', 'WEBRTC_ANNOUNCED_IP', 'FREESWITCH_HOST'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(
      `Warning: Missing environment variables: ${missing.join(', ')}. Using defaults.`
    );
  }

  // Validate port ranges
  if (config.mediasoup.worker.rtcMinPort >= config.mediasoup.worker.rtcMaxPort) {
    throw new Error('RTC_MIN_PORT must be less than RTC_MAX_PORT');
  }

  // Ensure sufficient port range
  const portRange =
    config.mediasoup.worker.rtcMaxPort - config.mediasoup.worker.rtcMinPort;
  if (portRange < 100) {
    throw new Error('RTC port range should be at least 100 ports');
  }
}
