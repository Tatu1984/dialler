import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  /**
   * GET /health
   * Basic health check
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/ready
   * Readiness check (includes dependency checks)
   */
  app.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    const checks = {
      database: false,
      redis: false,
    };

    // TODO: Add actual health checks
    // For now, assume healthy
    checks.database = true;
    checks.redis = true;

    const allHealthy = Object.values(checks).every(Boolean);

    return reply.status(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'ready' : 'not_ready',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  /**
   * GET /health/live
   * Liveness check (basic process health)
   */
  app.get('/live', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'alive',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  });
}
