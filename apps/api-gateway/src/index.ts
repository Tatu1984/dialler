import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { tenantRoutes } from './routes/tenants';
import { campaignRoutes } from './routes/campaigns';
import { leadRoutes } from './routes/leads';
import { queueRoutes } from './routes/queues';
import { agentRoutes } from './routes/agents';
import { teamRoutes } from './routes/teams';
import { skillRoutes } from './routes/skills';
import { leadListRoutes } from './routes/lead-lists';
import { dispositionRoutes } from './routes/dispositions';
import { dncRoutes } from './routes/dnc';
import { scriptRoutes } from './routes/scripts';
import { healthRoutes } from './routes/health';
import { errorHandler } from './middleware/error-handler';
import { initializeSocketServer } from './socket';

const envToLogger = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
  production: true,
  test: false,
};

async function buildApp() {
  const app = Fastify({
    logger: envToLogger[process.env.NODE_ENV as keyof typeof envToLogger] ?? true,
  });

  // Register plugins
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
  });

  await app.register(cookie, {
    secret: process.env.SESSION_SECRET || 'nexusdialer-session-secret',
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'nexusdialer-jwt-secret',
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Error handler
  app.setErrorHandler(errorHandler);

  // Register routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(tenantRoutes, { prefix: '/api/v1/tenants' });
  await app.register(campaignRoutes, { prefix: '/api/v1/campaigns' });
  await app.register(leadRoutes, { prefix: '/api/v1/leads' });
  await app.register(leadListRoutes, { prefix: '/api/v1/lead-lists' });
  await app.register(queueRoutes, { prefix: '/api/v1/queues' });
  await app.register(agentRoutes, { prefix: '/api/v1/agents' });
  await app.register(teamRoutes, { prefix: '/api/v1/teams' });
  await app.register(skillRoutes, { prefix: '/api/v1/skills' });
  await app.register(dispositionRoutes, { prefix: '/api/v1/dispositions' });
  await app.register(dncRoutes, { prefix: '/api/v1/dnc' });
  await app.register(scriptRoutes, { prefix: '/api/v1/scripts' });

  return app;
}

async function start() {
  const app = await buildApp();
  const port = parseInt(process.env.PORT || '4000', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });

    // Initialize Socket.io with the HTTP server
    const httpServer = app.server;
    initializeSocketServer(httpServer);

    console.log(`API Gateway running at http://${host}:${port}`);
    console.log(`WebSocket server initialized`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
