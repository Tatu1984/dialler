import type { Socket } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  CallStartedPayload,
  CallEndedPayload,
} from '@nexusdialer/events';
import { getSocketServer, emitToTenant, emitToQueue } from './index';
import { getDb, calls, leads, agentProfiles, campaigns } from '@nexusdialer/database';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

type NexusSocketClient = Socket<ClientToServerEvents, ServerToClientEvents, any, SocketData>;

const db = getDb();

// In-memory call state (in production, use Redis)
const activeCalls = new Map<string, {
  callId: string;
  agentId: string;
  userId: string;
  tenantId: string;
  phoneNumber: string;
  leadId?: string;
  campaignId?: string;
  queueId?: string;
  direction: 'inbound' | 'outbound';
  state: 'dialing' | 'ringing' | 'answered' | 'held' | 'ended';
  startTime: Date;
  answerTime?: Date;
  endTime?: Date;
  muted: boolean;
}>();

export function setupCallHandlers(socket: NexusSocketClient) {
  const { userId, tenantId, agentId } = socket.data;

  // Handle dial request
  socket.on('call:dial', async (data, callback) => {
    try {
      if (!agentId) {
        return callback({ success: false, error: 'Not logged in as agent' });
      }

      const callId = randomUUID();
      const now = new Date();

      // Create call record
      const callState = {
        callId,
        agentId,
        userId,
        tenantId,
        phoneNumber: data.phoneNumber,
        leadId: data.leadId,
        campaignId: data.campaignId,
        direction: 'outbound' as const,
        state: 'dialing' as const,
        startTime: now,
        muted: false,
      };

      activeCalls.set(callId, callState);

      // Persist to database
      try {
        await db.insert(calls).values({
          id: callId,
          tenantId,
          agentId,
          leadId: data.leadId,
          campaignId: data.campaignId,
          direction: 'outbound',
          status: 'dialing',
          phoneNumber: data.phoneNumber,
          startTime: now,
        });
      } catch (dbError) {
        console.error('Failed to persist call:', dbError);
      }

      // Emit call started event
      const callPayload: CallStartedPayload = {
        callId,
        agentId,
        leadId: data.leadId,
        direction: 'outbound',
        phoneNumber: data.phoneNumber,
        campaignId: data.campaignId,
        timestamp: now.toISOString(),
      };

      socket.emit('call:started', callPayload);
      emitToTenant(tenantId, 'call:started', callPayload);

      // Update agent state to on_call
      getSocketServer()?.to(`tenant:${tenantId}`).emit('agent:state-changed', {
        agentId,
        userId,
        previousState: 'available',
        newState: 'on_call',
        timestamp: now.toISOString(),
      });

      // Simulate ring after delay (in real system, this comes from FreeSWITCH ESL)
      setTimeout(() => {
        const call = activeCalls.get(callId);
        if (call && call.state === 'dialing') {
          call.state = 'ringing';
          socket.emit('call:ringing', { callId, phoneNumber: data.phoneNumber });
        }
      }, 1000);

      callback({ success: true, callId });
    } catch (error) {
      console.error('Call dial error:', error);
      callback({ success: false, error: 'Failed to initiate call' });
    }
  });

  // Handle answer
  socket.on('call:answer', async (data, callback) => {
    try {
      const call = activeCalls.get(data.callId);
      if (!call) {
        return callback({ success: false, error: 'Call not found' });
      }

      if (call.agentId !== agentId) {
        return callback({ success: false, error: 'Not your call' });
      }

      call.state = 'answered';
      call.answerTime = new Date();

      // Update database
      try {
        await db.update(calls)
          .set({ status: 'answered', answerTime: call.answerTime })
          .where(eq(calls.id, data.callId));
      } catch (dbError) {
        console.error('Failed to update call:', dbError);
      }

      socket.emit('call:answered', {
        callId: data.callId,
        agentId: call.agentId,
        timestamp: new Date().toISOString(),
      });

      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: 'Failed to answer call' });
    }
  });

  // Handle hangup
  socket.on('call:hangup', async (data, callback) => {
    try {
      const call = activeCalls.get(data.callId);
      if (!call) {
        return callback({ success: false, error: 'Call not found' });
      }

      if (call.agentId !== agentId) {
        return callback({ success: false, error: 'Not your call' });
      }

      call.state = 'ended';
      call.endTime = new Date();

      const duration = call.answerTime
        ? Math.floor((call.endTime.getTime() - call.answerTime.getTime()) / 1000)
        : 0;

      // Update database
      try {
        await db.update(calls)
          .set({
            status: 'completed',
            endTime: call.endTime,
            duration,
          })
          .where(eq(calls.id, data.callId));
      } catch (dbError) {
        console.error('Failed to update call:', dbError);
      }

      const endPayload: CallEndedPayload = {
        callId: data.callId,
        agentId: call.agentId,
        duration,
        timestamp: call.endTime.toISOString(),
      };

      socket.emit('call:ended', endPayload);
      emitToTenant(tenantId, 'call:ended', endPayload);

      // Update agent state back to available
      getSocketServer()?.to(`tenant:${tenantId}`).emit('agent:state-changed', {
        agentId: call.agentId,
        userId,
        previousState: 'on_call',
        newState: 'available',
        timestamp: new Date().toISOString(),
      });

      // Clean up
      activeCalls.delete(data.callId);

      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: 'Failed to hang up call' });
    }
  });

  // Handle hold
  socket.on('call:hold', async (data, callback) => {
    try {
      const call = activeCalls.get(data.callId);
      if (!call) {
        return callback({ success: false, error: 'Call not found' });
      }

      if (call.agentId !== agentId) {
        return callback({ success: false, error: 'Not your call' });
      }

      call.state = 'held';

      socket.emit('call:held', { callId: data.callId, isOnHold: true });

      getSocketServer()?.to(`tenant:${tenantId}`).emit('agent:state-changed', {
        agentId: call.agentId,
        userId,
        previousState: 'on_call',
        newState: 'on_hold',
        timestamp: new Date().toISOString(),
      });

      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: 'Failed to hold call' });
    }
  });

  // Handle unhold
  socket.on('call:unhold', async (data, callback) => {
    try {
      const call = activeCalls.get(data.callId);
      if (!call) {
        return callback({ success: false, error: 'Call not found' });
      }

      if (call.agentId !== agentId) {
        return callback({ success: false, error: 'Not your call' });
      }

      call.state = 'answered';

      socket.emit('call:held', { callId: data.callId, isOnHold: false });

      getSocketServer()?.to(`tenant:${tenantId}`).emit('agent:state-changed', {
        agentId: call.agentId,
        userId,
        previousState: 'on_hold',
        newState: 'on_call',
        timestamp: new Date().toISOString(),
      });

      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: 'Failed to unhold call' });
    }
  });

  // Handle mute
  socket.on('call:mute', async (data, callback) => {
    try {
      const call = activeCalls.get(data.callId);
      if (!call) {
        return callback({ success: false, error: 'Call not found' });
      }

      if (call.agentId !== agentId) {
        return callback({ success: false, error: 'Not your call' });
      }

      call.muted = data.muted;
      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: 'Failed to mute/unmute' });
    }
  });

  // Handle transfer
  socket.on('call:transfer', async (data, callback) => {
    try {
      const call = activeCalls.get(data.callId);
      if (!call) {
        return callback({ success: false, error: 'Call not found' });
      }

      if (call.agentId !== agentId) {
        return callback({ success: false, error: 'Not your call' });
      }

      // In real implementation, this would:
      // 1. For blind transfer: immediately transfer the call
      // 2. For warm transfer: conference in the target, wait for agent to drop

      console.log(`Transfer request: ${data.type} transfer to ${data.target}`);

      // Emit transfer initiated event (custom event, would need to be added to types)
      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: 'Failed to transfer call' });
    }
  });
}

// Helper to get active calls for an agent
export function getActiveCallsForAgent(agentId: string) {
  const calls: typeof activeCalls extends Map<string, infer V> ? V[] : never = [];
  activeCalls.forEach((call) => {
    if (call.agentId === agentId && call.state !== 'ended') {
      calls.push(call);
    }
  });
  return calls;
}

// Helper to get active calls for a tenant
export function getActiveCallsForTenant(tenantId: string) {
  const calls: typeof activeCalls extends Map<string, infer V> ? V[] : never = [];
  activeCalls.forEach((call) => {
    if (call.tenantId === tenantId && call.state !== 'ended') {
      calls.push(call);
    }
  });
  return calls;
}

// Clean up stale calls (run periodically)
export function cleanupStaleCalls() {
  const now = Date.now();
  const maxCallDuration = 4 * 60 * 60 * 1000; // 4 hours

  activeCalls.forEach((call, callId) => {
    const age = now - call.startTime.getTime();
    if (age > maxCallDuration) {
      console.log(`Cleaning up stale call: ${callId}`);
      activeCalls.delete(callId);
    }
  });
}
