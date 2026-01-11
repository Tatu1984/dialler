# NexusDialer WebRTC Gateway

WebRTC Gateway for browser-based calling in NexusDialer. Provides WebRTC-to-SIP bridging using MediaSoup and SIP.js.

## Features

- **WebRTC Support**: Browser-based calling using MediaSoup SFU
- **SIP Integration**: Seamless WebRTC-to-SIP bridging with FreeSWITCH
- **Real-time Communication**: Socket.IO for real-time call events
- **Call Controls**: Full support for hold, mute, transfer, and DTMF
- **Scalable**: Multi-worker MediaSoup setup for high performance
- **TypeScript**: Full type safety throughout the codebase

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Browser   │◄───────►│  WebRTC Gateway  │◄───────►│ FreeSWITCH  │
│  (WebRTC)   │ Socket  │  (MediaSoup +    │   SIP   │    (SIP)    │
│             │  .IO    │    SIP.js)       │         │             │
└─────────────┘         └──────────────────┘         └─────────────┘
                               │
                               │ Events
                               ▼
                        ┌──────────────┐
                        │    Kafka     │
                        └──────────────┘
```

## Installation

```bash
# Install dependencies
npm install
# or
pnpm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Key Configuration Options

- **PORT**: Server port (default: 3005)
- **WEBRTC_ANNOUNCED_IP**: Your public IP address for WebRTC
- **FREESWITCH_HOST**: FreeSWITCH server hostname
- **FREESWITCH_WS_URL**: FreeSWITCH WebSocket URL
- **RTC_MIN_PORT/RTC_MAX_PORT**: Port range for RTC connections

## Development

```bash
# Start in development mode with hot reload
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

### REST API

- `GET /` - Service information
- `GET /api/webrtc/health` - Health check
- `GET /api/webrtc/capabilities/:tenantId` - Get router capabilities
- `GET /api/webrtc/sessions` - List active sessions
- `GET /api/webrtc/sessions/:callId` - Get session details
- `GET /api/webrtc/stats` - Server statistics
- `GET /api/webrtc/stats/agent/:agentId` - Agent statistics
- `POST /api/webrtc/sessions/:callId/terminate` - Terminate session

### Socket.IO Events

#### Client to Server

**WebRTC Events:**
- `webrtc:get-router-capabilities` - Get MediaSoup router capabilities
- `webrtc:create-transport` - Create WebRTC transport
- `webrtc:connect-transport` - Connect WebRTC transport
- `webrtc:produce` - Create producer for audio/video
- `webrtc:consume` - Create consumer for audio/video

**Call Control Events:**
- `call:dial` - Initiate outbound call
- `call:answer` - Answer incoming call
- `call:hangup` - End call
- `call:hold` - Place call on hold
- `call:unhold` - Resume call from hold
- `call:mute` - Mute/unmute audio
- `call:transfer` - Transfer call
- `call:dtmf` - Send DTMF tones

#### Server to Client

- `webrtc:peer-connected` - Peer connection established
- `webrtc:peer-disconnected` - Peer disconnected
- `call:incoming` - Incoming call notification
- `call:ringing` - Call is ringing
- `call:answered` - Call answered
- `call:ended` - Call ended
- `call:failed` - Call failed
- `call:held` - Call hold state changed
- `call:muted` - Call mute state changed
- `call:transferred` - Call transferred
- `error` - Error occurred

## Usage Example

### Client-Side Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3005', {
  auth: {
    token: 'your-jwt-token',
    agentId: 'agent-uuid',
    tenantId: 'tenant-uuid',
    userId: 'user-uuid'
  }
});

// Wait for connection
socket.on('connected', (data) => {
  console.log('Connected:', data);
});

// Get router capabilities
socket.emit('webrtc:get-router-capabilities', (response) => {
  console.log('Capabilities:', response.capabilities);
});

// Make outbound call
socket.emit('call:dial', {
  phoneNumber: '+1234567890',
  campaignId: 'campaign-uuid',
  leadId: 'lead-uuid'
}, (response) => {
  if (response.success) {
    console.log('Call initiated:', response.callId);
  }
});

// Listen for call events
socket.on('call:ringing', (data) => {
  console.log('Call ringing:', data.callId);
});

socket.on('call:answered', (data) => {
  console.log('Call answered:', data.callId);
});

socket.on('call:ended', (data) => {
  console.log('Call ended:', data.callId, 'Duration:', data.duration);
});
```

### Making a Call

```typescript
// 1. Create send transport
socket.emit('webrtc:create-transport',
  { direction: 'send' },
  async (response) => {
    const transport = device.createSendTransport(response);

    // 2. Connect transport
    transport.on('connect', async ({ dtlsParameters }, callback) => {
      socket.emit('webrtc:connect-transport', {
        transportId: transport.id,
        dtlsParameters
      }, () => callback());
    });

    // 3. Produce audio
    transport.on('produce', async (parameters, callback) => {
      socket.emit('webrtc:produce', {
        transportId: transport.id,
        kind: parameters.kind,
        rtpParameters: parameters.rtpParameters
      }, ({ producerId }) => {
        callback({ id: producerId });
      });
    });

    // 4. Get user media and produce
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioTrack = stream.getAudioTracks()[0];
    await transport.produce({ track: audioTrack });

    // 5. Dial
    socket.emit('call:dial', {
      phoneNumber: '+1234567890'
    }, (response) => {
      console.log('Call ID:', response.callId);
    });
  }
);
```

### Call Controls

```typescript
// Hold call
socket.emit('call:hold', { callId }, (response) => {
  console.log('Call on hold:', response.success);
});

// Unhold call
socket.emit('call:unhold', { callId }, (response) => {
  console.log('Call resumed:', response.success);
});

// Mute audio
socket.emit('call:mute', { callId, muted: true }, (response) => {
  console.log('Muted:', response.success);
});

// Send DTMF
socket.emit('call:dtmf', { callId, tone: '1' }, (response) => {
  console.log('DTMF sent:', response.success);
});

// Transfer call
socket.emit('call:transfer', {
  callId,
  target: '+1987654321',
  transferType: 'blind'
}, (response) => {
  console.log('Transfer initiated:', response.success);
});

// Hangup
socket.emit('call:hangup', { callId }, (response) => {
  console.log('Call ended:', response.success);
});
```

## System Requirements

- Node.js >= 20.0.0
- FreeSWITCH with WebRTC support
- Public IP address for WebRTC (or STUN/TURN server)
- Sufficient UDP port range (default: 10000-10100)

## Network Configuration

### Firewall Rules

Open the following ports:

- TCP 3005 (HTTP/WebSocket)
- UDP 10000-10100 (RTC media)

### NAT/Public IP

For production deployments behind NAT, configure:

```bash
WEBRTC_ANNOUNCED_IP=your.public.ip.address
```

Or use TURN servers for complex network scenarios.

## Monitoring

### Health Check

```bash
curl http://localhost:3005/api/webrtc/health
```

### Statistics

```bash
# Overall stats
curl http://localhost:3005/api/webrtc/stats

# Agent stats
curl http://localhost:3005/api/webrtc/stats/agent/{agentId}

# Active sessions
curl http://localhost:3005/api/webrtc/sessions
```

## Integration with NexusDialer

The WebRTC Gateway integrates with:

- **Auth Service**: Token validation for agent authentication
- **Agent Service**: Agent state and presence
- **Call Events**: Publishes call events to Kafka
- **FreeSWITCH**: SIP telephony backend

## Troubleshooting

### WebRTC Connection Issues

1. **Check WEBRTC_ANNOUNCED_IP**: Must be your public IP
2. **Verify port range**: Ensure UDP ports 10000-10100 are open
3. **Check browser console**: Look for ICE connection errors
4. **Test STUN/TURN**: Use TURN server if behind restrictive NAT

### SIP Connection Issues

1. **Verify FreeSWITCH**: Ensure FreeSWITCH is running
2. **Check WebSocket URL**: Verify FREESWITCH_WS_URL is correct
3. **Review SIP credentials**: Check agent SIP configuration
4. **Check logs**: Review FreeSWITCH and gateway logs

### Media Issues

1. **Check codecs**: Verify codec compatibility
2. **Network bandwidth**: Ensure sufficient bandwidth
3. **Firewall**: Verify UDP media ports are accessible
4. **Packet loss**: Check network quality

## License

Private - NexusDialer

## Support

For issues and support, contact the NexusDialer development team.
