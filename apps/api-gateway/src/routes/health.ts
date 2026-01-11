import type { FastifyInstance } from 'fastify';
import { getDb } from '@nexusdialer/database';
import { sql } from 'drizzle-orm';

const db = getDb();

/**
 * Health Check Routes
 */
export async function healthRoutes(app: FastifyInstance) {
  /**
   * GET /
   * Basic health check
   */
  app.get('/', async (request, reply) => {
    return reply.send({
      success: true,
      data: {
        status: 'healthy',
        service: 'nexusdialer-api-gateway',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  });

  /**
   * GET /ready
   * Readiness check - verifies dependencies are available
   */
  app.get('/ready', async (request, reply) => {
    const checks: Record<string, any> = {
      database: { status: 'unknown' },
      memory: { status: 'unknown' },
      uptime: { status: 'unknown' },
    };

    let isReady = true;

    // Check database connection
    try {
      await db.execute(sql`SELECT 1`);
      checks.database = {
        status: 'healthy',
        message: 'Database connection successful',
      };
    } catch (error) {
      isReady = false;
      checks.database = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    if (heapUsedPercent > 90) {
      isReady = false;
      checks.memory = {
        status: 'unhealthy',
        message: `High memory usage: ${heapUsedPercent.toFixed(2)}%`,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        unit: 'MB',
      };
    } else {
      checks.memory = {
        status: 'healthy',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsedPercent: heapUsedPercent.toFixed(2),
        unit: 'MB',
      };
    }

    // Check uptime (mark unhealthy if just started)
    const uptime = process.uptime();
    if (uptime < 5) {
      isReady = false;
      checks.uptime = {
        status: 'starting',
        message: 'Service is still starting up',
        uptime: uptime.toFixed(2),
        unit: 'seconds',
      };
    } else {
      checks.uptime = {
        status: 'healthy',
        uptime: uptime.toFixed(2),
        unit: 'seconds',
      };
    }

    const statusCode = isReady ? 200 : 503;

    return reply.status(statusCode).send({
      success: isReady,
      data: {
        status: isReady ? 'ready' : 'not_ready',
        service: 'nexusdialer-api-gateway',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
        checks,
      },
    });
  });

  /**
   * GET /live
   * Liveness check - simple check to see if service is alive
   */
  app.get('/live', async (request, reply) => {
    return reply.send({
      success: true,
      data: {
        status: 'alive',
        timestamp: new Date().toISOString(),
      },
    });
  });
}
