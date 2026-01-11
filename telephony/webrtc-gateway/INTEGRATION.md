# WebRTC Gateway Integration Guide

This guide explains how to integrate the NexusDialer WebRTC Gateway into your browser-based application.

## Table of Contents

1. [Client Setup](#client-setup)
2. [Authentication](#authentication)
3. [WebRTC Connection Flow](#webrtc-connection-flow)
4. [Making Calls](#making-calls)
5. [Receiving Calls](#receiving-calls)
6. [Call Controls](#call-controls)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

## Client Setup

### Install Dependencies

```bash
npm install socket.io-client mediasoup-client
```

### Initialize MediaSoup Device

```typescript
import { Device } from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';

// Create MediaSoup device
const device = new Device();

// Create Socket.IO connection
const socket: Socket = io('http://localhost:3005', {
  auth: {
    token: 'your-jwt-token',
    agentId: 'agent-uuid',
    tenantId: 'tenant-uuid',
    userId: 'user-uuid'
  },
  transports: ['websocket', 'polling']
});
```

## Authentication

The WebRTC Gateway requires authentication via Socket.IO handshake:

```typescript
interface AuthCredentials {
  token: string;      // JWT token from auth service
  agentId: string;    // Agent UUID
  tenantId: string;   // Tenant UUID
  userId: string;     // User UUID
}

// Connect with authentication
const socket = io(GATEWAY_URL, {
  auth: credentials
});

// Wait for connection
socket.on('connected', (data) => {
  console.log('Connected to WebRTC Gateway:', data);
  // Initialize WebRTC
  initializeWebRTC();
});

// Handle authentication errors
socket.on('error', (error) => {
  console.error('Authentication failed:', error);
});
```

## WebRTC Connection Flow

### 1. Load Router Capabilities

```typescript
async function initializeWebRTC() {
  return new Promise((resolve, reject) => {
    socket.emit('webrtc:get-router-capabilities', async (response) => {
      if (!response.success) {
        return reject(new Error('Failed to get capabilities'));
      }

      try {
        // Load capabilities into device
        await device.load({ routerRtpCapabilities: response.capabilities });
        console.log('Device loaded with capabilities');
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  });
}
```

### 2. Create Send Transport

```typescript
interface TransportOptions {
  id: string;
  iceParameters: any;
  iceCandidates: any[];
  dtlsParameters: any;
}

async function createSendTransport(): Promise<mediasoup.types.Transport> {
  return new Promise((resolve, reject) => {
    socket.emit('webrtc:create-transport',
      { direction: 'send' },
      async (response: TransportOptions) => {
        if (!response.success) {
          return reject(new Error(response.error));
        }

        try {
          const transport = device.createSendTransport({
            id: response.id,
            iceParameters: response.iceParameters,
            iceCandidates: response.iceCandidates,
            dtlsParameters: response.dtlsParameters,
          });

          // Handle transport connect event
          transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
              socket.emit('webrtc:connect-transport', {
                transportId: transport.id,
                dtlsParameters
              }, (response) => {
                if (response.success) {
                  callback();
                } else {
                  errback(new Error(response.error));
                }
              });
            } catch (error) {
              errback(error);
            }
          });

          // Handle transport produce event
          transport.on('produce', async (parameters, callback, errback) => {
            try {
              socket.emit('webrtc:produce', {
                transportId: transport.id,
                kind: parameters.kind,
                rtpParameters: parameters.rtpParameters
              }, (response) => {
                if (response.success) {
                  callback({ id: response.producerId });
                } else {
                  errback(new Error(response.error));
                }
              });
            } catch (error) {
              errback(error);
            }
          });

          // Handle connection state changes
          transport.on('connectionstatechange', (state) => {
            console.log('Transport connection state:', state);
            if (state === 'failed' || state === 'closed') {
              console.error('Transport failed or closed');
            }
          });

          resolve(transport);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}
```

### 3. Create Receive Transport (for incoming audio)

```typescript
async function createReceiveTransport(): Promise<mediasoup.types.Transport> {
  return new Promise((resolve, reject) => {
    socket.emit('webrtc:create-transport',
      { direction: 'receive' },
      async (response: TransportOptions) => {
        if (!response.success) {
          return reject(new Error(response.error));
        }

        try {
          const transport = device.createRecvTransport({
            id: response.id,
            iceParameters: response.iceParameters,
            iceCandidates: response.iceCandidates,
            dtlsParameters: response.dtlsParameters,
          });

          transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
              socket.emit('webrtc:connect-transport', {
                transportId: transport.id,
                dtlsParameters
              }, (response) => {
                if (response.success) {
                  callback();
                } else {
                  errback(new Error(response.error));
                }
              });
            } catch (error) {
              errback(error);
            }
          });

          transport.on('connectionstatechange', (state) => {
            console.log('Receive transport state:', state);
          });

          resolve(transport);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}
```

## Making Calls

### Complete Outbound Call Flow

```typescript
interface CallSession {
  callId: string;
  sendTransport: mediasoup.types.Transport;
  receiveTransport: mediasoup.types.Transport;
  producer?: mediasoup.types.Producer;
  consumer?: mediasoup.types.Consumer;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
}

let currentCall: CallSession | null = null;

async function makeCall(phoneNumber: string, options?: {
  campaignId?: string;
  leadId?: string;
}) {
  try {
    // 1. Create transports
    const sendTransport = await createSendTransport();
    const receiveTransport = await createReceiveTransport();

    // 2. Get user media
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false
    });

    // 3. Create producer
    const audioTrack = stream.getAudioTracks()[0];
    const producer = await sendTransport.produce({
      track: audioTrack,
      codecOptions: {
        opusStereo: false,
        opusDtx: true,
      }
    });

    // 4. Initiate call via SIP
    const callResponse = await new Promise((resolve, reject) => {
      socket.emit('call:dial', {
        phoneNumber,
        ...options
      }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });

    // 5. Store call session
    currentCall = {
      callId: callResponse.callId,
      sendTransport,
      receiveTransport,
      producer,
      localStream: stream,
    };

    console.log('Call initiated:', callResponse.callId);
    return callResponse.callId;

  } catch (error) {
    console.error('Failed to make call:', error);
    throw error;
  }
}

// Listen for call events
socket.on('call:ringing', (data) => {
  console.log('Call is ringing:', data.callId);
  updateCallUI('ringing');
});

socket.on('call:answered', (data) => {
  console.log('Call answered:', data.callId);
  updateCallUI('answered');

  // Start consuming remote audio
  consumeRemoteAudio(data.callId);
});

socket.on('call:ended', (data) => {
  console.log('Call ended:', data.callId, 'Duration:', data.duration);
  cleanupCall();
});

socket.on('call:failed', (data) => {
  console.error('Call failed:', data.callId, data.error);
  cleanupCall();
});
```

### Consuming Remote Audio

```typescript
async function consumeRemoteAudio(callId: string) {
  if (!currentCall) return;

  try {
    const { receiveTransport } = currentCall;

    // Get producer ID from server (you'll need to implement this)
    // For now, this is a placeholder
    const producerId = 'remote-producer-id';

    const consumer = await receiveTransport.consume({
      id: consumerId,
      producerId,
      kind: 'audio',
      rtpParameters,
    });

    // Create remote stream
    const remoteStream = new MediaStream([consumer.track]);
    currentCall.consumer = consumer;
    currentCall.remoteStream = remoteStream;

    // Play remote audio
    const audioElement = document.getElementById('remote-audio') as HTMLAudioElement;
    audioElement.srcObject = remoteStream;
    audioElement.play();

  } catch (error) {
    console.error('Failed to consume remote audio:', error);
  }
}
```

## Receiving Calls

```typescript
// Listen for incoming calls
socket.on('call:incoming', async (data) => {
  console.log('Incoming call from:', data.phoneNumber);

  // Show incoming call UI
  showIncomingCallUI(data);
});

async function answerCall(callId: string) {
  try {
    // 1. Create transports
    const sendTransport = await createSendTransport();
    const receiveTransport = await createReceiveTransport();

    // 2. Get user media
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 3. Create producer
    const audioTrack = stream.getAudioTracks()[0];
    const producer = await sendTransport.produce({ track: audioTrack });

    // 4. Answer the call
    const response = await new Promise((resolve, reject) => {
      socket.emit('call:answer', { callId }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });

    // 5. Store call session
    currentCall = {
      callId,
      sendTransport,
      receiveTransport,
      producer,
      localStream: stream,
    };

    console.log('Call answered:', callId);

    // 6. Start consuming remote audio
    consumeRemoteAudio(callId);

  } catch (error) {
    console.error('Failed to answer call:', error);
    throw error;
  }
}
```

## Call Controls

### Hold/Unhold

```typescript
async function holdCall(callId: string) {
  return new Promise((resolve, reject) => {
    socket.emit('call:hold', { callId }, (response) => {
      if (response.success) {
        console.log('Call on hold');
        resolve(true);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

async function unholdCall(callId: string) {
  return new Promise((resolve, reject) => {
    socket.emit('call:unhold', { callId }, (response) => {
      if (response.success) {
        console.log('Call resumed');
        resolve(true);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

// Listen for hold state changes
socket.on('call:held', (data) => {
  console.log('Hold state changed:', data.isOnHold);
  updateCallUI(data.isOnHold ? 'on_hold' : 'active');
});
```

### Mute/Unmute

```typescript
async function muteCall(callId: string, muted: boolean) {
  // Client-side mute (stop sending audio)
  if (currentCall?.producer) {
    if (muted) {
      currentCall.producer.pause();
    } else {
      currentCall.producer.resume();
    }
  }

  // Notify server
  return new Promise((resolve, reject) => {
    socket.emit('call:mute', { callId, muted }, (response) => {
      if (response.success) {
        console.log('Mute state:', muted);
        resolve(true);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

// Listen for mute state changes
socket.on('call:muted', (data) => {
  console.log('Mute state changed:', data.isMuted);
  updateMuteButton(data.isMuted);
});
```

### Send DTMF

```typescript
async function sendDTMF(callId: string, tone: string) {
  return new Promise((resolve, reject) => {
    socket.emit('call:dtmf', {
      callId,
      tone,
      duration: 100
    }, (response) => {
      if (response.success) {
        console.log('DTMF sent:', tone);
        resolve(true);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

// Example: Dial extension
async function dialExtension(callId: string, extension: string) {
  for (const digit of extension) {
    await sendDTMF(callId, digit);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}
```

### Transfer Call

```typescript
async function transferCall(callId: string, target: string, transferType: 'blind' | 'warm' = 'blind') {
  return new Promise((resolve, reject) => {
    socket.emit('call:transfer', {
      callId,
      target,
      transferType
    }, (response) => {
      if (response.success) {
        console.log('Call transferred to:', target);
        resolve(true);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

// Listen for transfer events
socket.on('call:transferred', (data) => {
  console.log('Call transferred:', data.target);
  cleanupCall();
});
```

### Hangup

```typescript
async function hangupCall(callId: string) {
  return new Promise((resolve, reject) => {
    socket.emit('call:hangup', { callId }, (response) => {
      if (response.success) {
        console.log('Call ended');
        cleanupCall();
        resolve(true);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}
```

### Cleanup

```typescript
function cleanupCall() {
  if (!currentCall) return;

  // Stop all tracks
  if (currentCall.localStream) {
    currentCall.localStream.getTracks().forEach(track => track.stop());
  }

  // Close producer
  if (currentCall.producer) {
    currentCall.producer.close();
  }

  // Close consumer
  if (currentCall.consumer) {
    currentCall.consumer.close();
  }

  // Close transports
  if (currentCall.sendTransport) {
    currentCall.sendTransport.close();
  }

  if (currentCall.receiveTransport) {
    currentCall.receiveTransport.close();
  }

  currentCall = null;
  updateCallUI('idle');
}
```

## Error Handling

```typescript
// Socket connection errors
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  showError('Failed to connect to WebRTC Gateway');
});

socket.on('disconnect', (reason) => {
  console.warn('Disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Reconnect manually
    socket.connect();
  }
  cleanupCall();
});

// WebRTC errors
socket.on('error', (error) => {
  console.error('WebRTC error:', error);
  showError(error.message);
});

// Transport errors
function handleTransportError(error: Error) {
  console.error('Transport error:', error);
  showError('Media transport failed. Please check your connection.');
  cleanupCall();
}

// Media errors
async function handleMediaError(error: Error) {
  console.error('Media error:', error);

  if (error.name === 'NotAllowedError') {
    showError('Microphone access denied. Please allow microphone access.');
  } else if (error.name === 'NotFoundError') {
    showError('No microphone found. Please connect a microphone.');
  } else {
    showError('Failed to access microphone.');
  }
}
```

## Best Practices

### 1. Connection Management

```typescript
// Implement reconnection logic
socket.on('disconnect', () => {
  console.log('Disconnected, attempting to reconnect...');
  // Clean up current call
  cleanupCall();
});

socket.on('connect', () => {
  console.log('Reconnected to gateway');
  // Re-initialize WebRTC
  initializeWebRTC();
});
```

### 2. Resource Cleanup

```typescript
// Always clean up resources
window.addEventListener('beforeunload', () => {
  if (currentCall) {
    hangupCall(currentCall.callId);
  }
  socket.disconnect();
});
```

### 3. User Feedback

```typescript
// Provide visual feedback for all states
function updateCallUI(state: string) {
  const statusElement = document.getElementById('call-status');

  switch (state) {
    case 'initiating':
      statusElement.textContent = 'Dialing...';
      break;
    case 'ringing':
      statusElement.textContent = 'Ringing...';
      break;
    case 'answered':
      statusElement.textContent = 'Connected';
      break;
    case 'on_hold':
      statusElement.textContent = 'On Hold';
      break;
    case 'ending':
      statusElement.textContent = 'Ending call...';
      break;
    case 'idle':
      statusElement.textContent = 'Ready';
      break;
  }
}
```

### 4. Audio Quality

```typescript
// Use optimal audio constraints
const audioConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
  }
};

const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
```

### 5. Network Quality Monitoring

```typescript
// Monitor connection quality
async function monitorConnectionQuality() {
  if (!currentCall?.producer) return;

  const stats = await currentCall.producer.getStats();

  stats.forEach(report => {
    if (report.type === 'outbound-rtp') {
      console.log('Packet loss:', report.packetLost);
      console.log('Bytes sent:', report.bytesSent);
      console.log('RTT:', report.roundTripTime);
    }
  });
}

// Check quality every 5 seconds
setInterval(monitorConnectionQuality, 5000);
```

## Complete Example

See the [example client implementation](./examples/client.html) for a complete working example.

## Troubleshooting

### Common Issues

1. **No audio**: Check microphone permissions and device selection
2. **Connection fails**: Verify WEBRTC_ANNOUNCED_IP is correct
3. **Echo/feedback**: Enable echo cancellation in audio constraints
4. **Dropped calls**: Check network stability and firewall rules

### Debug Logging

Enable debug logging in browser console:

```typescript
// Enable Socket.IO debug logs
localStorage.debug = 'socket.io-client:*';

// Enable MediaSoup debug logs
// (set in device creation)
```

## Support

For issues and questions, refer to the main [README.md](./README.md) or contact support.
