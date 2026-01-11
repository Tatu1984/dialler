import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getDb } from '@nexusdialer/database';
import { initKafkaConsumer, initKafkaProducer } from './lib/kafka.js';
import { initRedis } from './lib/redis.js';
import { initVectorStore } from './lib/vector-store.js';
import assistRoutes from './routes/assist.js';
import { startTranscriptionConsumer } from './consumers/transcription-consumer.js';

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

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3011;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    });

    // Initialize dependencies
    fastify.log.info('Initializing database connection...');
    const db = getDb();

    fastify.log.info('Initializing Redis connection...');
    const redis = await initRedis();

    fastify.log.info('Initializing Kafka...');
    const kafkaProducer = await initKafkaProducer();
    const kafkaConsumer = await initKafkaConsumer();

    fastify.log.info('Initializing vector store...');
    const vectorStore = await initVectorStore();

    // Decorate fastify instance
    fastify.decorate('db', db);
    fastify.decorate('redis', redis);
    fastify.decorate('kafkaProducer', kafkaProducer);
    fastify.decorate('kafkaConsumer', kafkaConsumer);
    fastify.decorate('vectorStore', vectorStore);

    // Health check
    fastify.get('/health', async () => ({
      status: 'healthy',
      service: 'agent-assist',
      timestamp: new Date().toISOString(),
    }));

    // Register routes
    await fastify.register(assistRoutes, { prefix: '/api/assist' });

    // Start Kafka consumer for transcription events
    fastify.log.info('Starting transcription consumer...');
    await startTranscriptionConsumer(kafkaConsumer, fastify);

    // Start server
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Agent Assist Service running at http://${HOST}:${PORT}`);
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
    kafkaProducer: Awaited<ReturnType<typeof initKafkaProducer>>;
    kafkaConsumer: Awaited<ReturnType<typeof initKafkaConsumer>>;
    vectorStore: Awaited<ReturnType<typeof initVectorStore>>;
  }
}
