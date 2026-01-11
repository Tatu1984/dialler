import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { logger } from './utils/logger';
import { config, validateConfig } from './config';
import { mediaServer } from './webrtc/media-server';
import { peerManager } from './webrtc/peer-manager';
import { sipGateway } from './sip/gateway';
import { registerCallHandlers } from './handlers/call-handlers';
import webrtcRoutes from './routes/webrtc';

// ============================================
// Application Setup
// ============================================

const app = express();
const httpServer = createServer(app);

// ============================================
// Middleware
// ============================================

app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(
    {
      method: req.method,
      path: req.path,
      ip: req.ip,
    },
    'Incoming request'
  );
  next();
});

// ============================================
// Routes
// ============================================

app.get('/', (req, res) => {
  res.json({
    service: 'NexusDialer WebRTC Gateway',
    version: '0.1.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/webrtc', webrtcRoutes);

// ============================================
// Socket.IO Setup
// ============================================

const io = new SocketIOServer(httpServer, {
  cors: config.cors,
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const agentId = socket.handshake.auth.agentId;
    const tenantId = socket.handshake.auth.tenantId;
    const userId = socket.handshake.auth.userId;

    if (!token) {
      throw new Error('Authentication token required');
    }

    if (!agentId || !tenantId) {
      throw new Error('Agent ID and Tenant ID required');
    }

    // TODO: Validate token with auth service
    // For now, we'll accept any token
    // In production, verify JWT token here

    // Attach data to socket
    socket.data = {
      agentId,
      tenantId,
      userId: userId || agentId,
      authenticatedAt: new Date().toISOString(),
    };

    logger.info(
      {
        socketId: socket.id,
        agentId,
        tenantId,
        userId,
      },
      'Socket authenticated'
    );

    next();
  } catch (error) {
    logger.error({ error }, 'Socket authentication failed');
    next(new Error('Authentication failed'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  const { agentId, tenantId, userId } = socket.data as any;

  logger.info(
    {
      socketId: socket.id,
      agentId,
      tenantId,
      userId,
    },
    'Socket connected'
  );

  // Register call handlers for this socket
  registerCallHandlers(socket);

  // Emit connection success
  socket.emit('connected', {
    userId,
    agentId,
    timestamp: new Date().toISOString(),
  });

  // Handle errors
  socket.on('error', (error) => {
    logger.error(
      {
        error,
        socketId: socket.id,
        agentId,
      },
      'Socket error'
    );
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    logger.info(
      {
        socketId: socket.id,
        agentId,
        reason,
      },
      'Socket disconnected'
    );
  });
});

// ============================================
// Error Handling
// ============================================

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(
    {
      error: err,
      path: req.path,
      method: req.method,
    },
    'Express error'
  );

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// ============================================
// Server Initialization
// ============================================

async function startServer() {
  try {
    logger.info('Starting NexusDialer WebRTC Gateway...');

    // Validate configuration
    validateConfig();
    logger.info('Configuration validated');

    // Initialize MediaSoup media server
    await mediaServer.initialize();
    logger.info('MediaSoup media server initialized');

    // Start HTTP server
    httpServer.listen(config.port, config.host, () => {
      logger.info(
        {
          host: config.host,
          port: config.port,
          env: process.env.NODE_ENV || 'development',
        },
        'WebRTC Gateway server started'
      );
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// ============================================
// Graceful Shutdown
// ============================================

async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal');

  try {
    // Stop accepting new connections
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    // Close all Socket.IO connections
    io.close(() => {
      logger.info('Socket.IO closed');
    });

    // Cleanup peer manager
    peerManager.cleanup();
    logger.info('Peer manager cleaned up');

    // Shutdown SIP gateway
    await sipGateway.shutdown();
    logger.info('SIP gateway shut down');

    // Close media server
    await mediaServer.close();
    logger.info('Media server closed');

    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
  gracefulShutdown('UNHANDLED_REJECTION');
});

// ============================================
// Start the Server
// ============================================

startServer();

export { app, httpServer, io };
