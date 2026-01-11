import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { getDb } from '@nexusdialer/database';
import { initKafkaProducer } from './lib/kafka.js';
import { initRedis } from './lib/redis.js';
import transcriptionRoutes from './routes/transcription.js';
import { audioStreamHandler } from './websocket/audio-stream.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3010;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    });

    await fastify.register(websocket, {
      options: {
        maxPayload: 10 * 1024 * 1024, // 10MB for audio chunks
        clientTracking: true,
      },
    });

    // Initialize dependencies
    fastify.log.info('Initializing database connection...');
    const db = getDb();

    fastify.log.info('Initializing Redis connection...');
    const redis = await initRedis();

    fastify.log.info('Initializing Kafka producer...');
    const kafka = await initKafkaProducer();

    // Decorate fastify instance
    fastify.decorate('db', db);
    fastify.decorate('redis', redis);
    fastify.decorate('kafka', kafka);

    // Health check
    fastify.get('/health', async () => ({
      status: 'healthy',
      service: 'speech-service',
      timestamp: new Date().toISOString(),
    }));

    // Register routes
    await fastify.register(transcriptionRoutes, { prefix: '/api/transcription' });

    // Register WebSocket handler
    fastify.register(async (fastify) => {
      fastify.get('/ws/audio-stream', { websocket: true }, audioStreamHandler);
    });

    // Start server
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Speech Service running at http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async () => {
  fastify.log.info('Received shutdown signal, closing gracefully...');
  try {
    await fastify.close();
    process.exit(0);
  } catch (err) {
    fastify.log.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

start();

// Type declarations
declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof getDb>;
    redis: Awaited<ReturnType<typeof initRedis>>;
    kafka: Awaited<ReturnType<typeof initKafkaProducer>>;
  }
}
