import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '@nexusdialer/events';
import { setupCallHandlers, cleanupStaleCalls } from './call-handler';

export type NexusSocket = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let io: NexusSocket | null = null;

export function initializeSocketServer(httpServer: HttpServer): NexusSocket {
  io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
      ],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // TODO: Verify JWT token and extract user data
      // For now, accept any token for development
      const userId = socket.handshake.auth.userId || 'anonymous';
      const tenantId = socket.handshake.auth.tenantId || 'default';
      const role = socket.handshake.auth.role || 'agent';
      const agentId = socket.handshake.auth.agentId;

      socket.data = {
        userId,
        tenantId,
        role,
        agentId,
        authenticatedAt: new Date().toISOString(),
      };

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, tenantId, agentId } = socket.data;

    console.log(`Socket connected: ${socket.id} (user: ${userId}, tenant: ${tenantId})`);

    // Auto-join tenant room
    socket.join(`tenant:${tenantId}`);

    // Send connection confirmation
    socket.emit('connected', { userId, agentId });

    // Room management
    socket.on('join:tenant', (newTenantId, callback) => {
      // Only allow joining own tenant
      if (newTenantId === tenantId) {
        socket.join(`tenant:${newTenantId}`);
        callback(true);
      } else {
        callback(false);
      }
    });

    socket.on('leave:tenant', (leaveTenantId) => {
      socket.leave(`tenant:${leaveTenantId}`);
    });

    socket.on('join:queue', (queueId, callback) => {
      socket.join(`queue:${queueId}`);
      callback(true);
    });

    socket.on('leave:queue', (queueId) => {
      socket.leave(`queue:${queueId}`);
    });

    socket.on('join:campaign', (campaignId, callback) => {
      socket.join(`campaign:${campaignId}`);
      callback(true);
    });

    socket.on('leave:campaign', (campaignId) => {
      socket.leave(`campaign:${campaignId}`);
    });

    // Agent state changes
    socket.on('agent:change-state', async (data, callback) => {
      try {
        if (!agentId) {
          return callback({ success: false, error: 'Not logged in as agent' });
        }

        // TODO: Update agent state in database
        // For now, just broadcast the change
        io?.to(`tenant:${tenantId}`).emit('agent:state-changed', {
          agentId,
          userId,
          previousState: 'available',
          newState: data.state,
          reason: data.reason,
          timestamp: new Date().toISOString(),
        });

        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: 'Failed to change state' });
      }
    });

    // Dashboard subscription
    socket.on('subscribe:dashboard', (callback) => {
      socket.join(`dashboard:${tenantId}`);
      callback({ success: true });
    });

    socket.on('unsubscribe:dashboard', () => {
      socket.leave(`dashboard:${tenantId}`);
    });

    // Set up call handlers
    setupCallHandlers(socket);

    // Disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (reason: ${reason})`);

      // Notify others in tenant about agent going offline
      if (agentId) {
        io?.to(`tenant:${tenantId}`).emit('agent:logout', {
          agentId,
          userId,
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  // Set up periodic cleanup of stale calls
  setInterval(cleanupStaleCalls, 60 * 1000); // Every minute

  return io;
}

export function getSocketServer(): NexusSocket | null {
  return io;
}

// Helper functions for emitting events from other parts of the application
export function emitToTenant<E extends keyof ServerToClientEvents>(
  tenantId: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
) {
  io?.to(`tenant:${tenantId}`).emit(event, ...args);
}

export function emitToQueue<E extends keyof ServerToClientEvents>(
  queueId: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
) {
  io?.to(`queue:${queueId}`).emit(event, ...args);
}

export function emitToCampaign<E extends keyof ServerToClientEvents>(
  campaignId: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
) {
  io?.to(`campaign:${campaignId}`).emit(event, ...args);
}

export function emitToDashboard<E extends keyof ServerToClientEvents>(
  tenantId: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
) {
  io?.to(`dashboard:${tenantId}`).emit(event, ...args);
}
