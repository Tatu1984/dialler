import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import pino from 'pino';
import dotenv from 'dotenv';
import { DialerManager } from './dialer/manager';
import { CallService } from './services/call-service';
import { initializeCallRoutes } from './routes/calls';

// Load environment variables
dotenv.config();

const logger = pino({
  name: 'dialer-engine',
  level: process.env.LOG_LEVEL || 'info',
});

// Configuration
const config = {
  port: parseInt(process.env.PORT || '3010', 10),
  freeswitchHost: process.env.FREESWITCH_HOST || 'localhost',
  freeswitchPort: parseInt(process.env.FREESWITCH_PORT || '8021', 10),
  freeswitchPassword: process.env.FREESWITCH_PASSWORD || 'ClueCon',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
};

// Initialize Express app
const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
  })
);

// Initialize dialer manager
let dialerManager: DialerManager;
let callService: CallService;

async function initializeServices(): Promise<void> {
  try {
    logger.info('Initializing services...');

    // Create dialer manager
    dialerManager = new DialerManager(config);

    // Initialize dialer manager (connects to FreeSWITCH and Kafka)
    await dialerManager.initialize();

    // Create call service
    callService = new CallService(config.redisUrl);

    logger.info('Services initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize services');
    throw error;
  }
}

// Initialize routes after services are ready
async function setupRoutes(): Promise<void> {
  // Mount call routes
  app.use('/api/v1', initializeCallRoutes(dialerManager, callService));

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      service: 'NexusDialer - Dialer Engine',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      path: req.path,
    });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error({ error: err, path: req.path }, 'Unhandled error');

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });
}

// Start server
async function startServer(): Promise<void> {
  try {
    // Initialize services
    await initializeServices();

    // Setup routes
    await setupRoutes();

    // Start listening
    const server = app.listen(config.port, () => {
      logger.info(
        {
          port: config.port,
          freeswitchHost: config.freeswitchHost,
          freeswitchPort: config.freeswitchPort,
          redisUrl: config.redisUrl,
          kafkaBrokers: config.kafkaBrokers,
        },
        'Dialer Engine started'
      );
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal');

      // Stop accepting new requests
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Shutdown dialer manager (stops all campaigns, disconnects from FreeSWITCH and Kafka)
          if (dialerManager) {
            await dialerManager.shutdown();
          }

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error({ error }, 'Error during shutdown');
          process.exit(1);
        }
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000); // 30 seconds
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error: Error) => {
      logger.error({ error }, 'Uncaught exception');
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error({ reason, promise }, 'Unhandled promise rejection');
      shutdown('unhandledRejection');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
startServer();

export { app, dialerManager, callService };
