import type { FastifyInstance } from 'fastify';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { getDb, queues, calls } from '@nexusdialer/database';
import { authenticate, requireRole } from '../middleware/auth';
import { NotFoundError, ForbiddenError } from '../middleware/error-handler';

const db = getDb();

interface CreateQueueBody {
  name: string;
  strategy?: string;
  ringTimeout?: number;
  maxWaitTime?: number;
  overflowQueueId?: string;
  settings?: any;
}

interface UpdateQueueBody {
  name?: string;
  strategy?: string;
  ringTimeout?: number;
  maxWaitTime?: number;
  overflowQueueId?: string;
  settings?: any;
}

interface ListQueuesQuery {
  page?: number;
  limit?: number;
}

/**
 * Queue Management Routes
 */
export async function queueRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /
   * List queues (paginated)
   */
  app.get<{ Querystring: ListQueuesQuery }>('/', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { page = 1, limit = 20 } = request.query;
    const offset = (page - 1) * limit;

    // Query queues
    const queueList = await db.query.queues.findMany({
      where: eq(queues.tenantId, request.user.tenantId),
      limit,
      offset,
      orderBy: [desc(queues.createdAt)],
    });

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(queues)
      .where(eq(queues.tenantId, request.user.tenantId));

    return reply.send({
      success: true,
      data: {
        queues: queueList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  });

  /**
   * GET /:id
   * Get queue by ID
   */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { id } = request.params;

    const queue = await db.query.queues.findFirst({
      where: and(eq(queues.id, id), eq(queues.tenantId, request.user.tenantId)),
    });

    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    return reply.send({
      success: true,
      data: {
        queue,
      },
    });
  });

  /**
   * GET /:id/stats
   * Get queue statistics
   */
  app.get<{ Params: { id: string } }>('/:id/stats', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { id } = request.params;

    // Verify queue exists
    const queue = await db.query.queues.findFirst({
      where: and(eq(queues.id, id), eq(queues.tenantId, request.user.tenantId)),
    });

    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get call statistics for today
    const [callStats] = await db
      .select({
        total: count(),
        answered: sql<number>`COUNT(*) FILTER (WHERE ${calls.answerTime} IS NOT NULL)`,
        abandoned: sql<number>`COUNT(*) FILTER (WHERE ${calls.answerTime} IS NULL)`,
      })
      .from(calls)
      .where(
        sql`${calls.queueId} = ${id} AND ${calls.tenantId} = ${request.user!.tenantId} AND ${calls.startTime} >= ${today}`
      );

    // Get average metrics for answered calls today
    const [avgMetrics] = await db
      .select({
        avgWaitTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${calls.answerTime} - ${calls.startTime})))`,
        avgTalkTime: sql<number>`AVG(${calls.talkDuration})`,
        avgHandleTime: sql<number>`AVG(${calls.talkDuration} + ${calls.wrapDuration})`,
      })
      .from(calls)
      .where(
        sql`${calls.queueId} = ${id} AND ${calls.tenantId} = ${request.user!.tenantId} AND ${calls.startTime} >= ${today} AND ${calls.answerTime} IS NOT NULL`
      );

    // Calculate service level (calls answered within threshold)
    const serviceLevelTarget = (queue.settings as any)?.serviceLevelTarget || 20;
    const [serviceLevel] = await db
      .select({
        withinSL: sql<number>`COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (${calls.answerTime} - ${calls.startTime})) <= ${serviceLevelTarget})`,
        total: sql<number>`COUNT(*)`,
      })
      .from(calls)
      .where(
        sql`${calls.queueId} = ${id} AND ${calls.tenantId} = ${request.user!.tenantId} AND ${calls.startTime} >= ${today} AND ${calls.answerTime} IS NOT NULL`
      );

    const serviceLevelPercentage =
      serviceLevel.total > 0 ? (serviceLevel.withinSL / serviceLevel.total) * 100 : 0;

    // Get calls waiting (mock - would come from real-time system)
    const callsWaiting = 0; // TODO: Get from real-time queue state

    return reply.send({
      success: true,
      data: {
        queueId: id,
        queueName: queue.name,
        stats: {
          today: {
            totalCalls: callStats.total,
            answered: callStats.answered,
            abandoned: callStats.abandoned,
            abandonRate:
              callStats.total > 0 ? ((callStats.abandoned / callStats.total) * 100).toFixed(2) : '0',
            avgWaitTime: Math.round(avgMetrics.avgWaitTime || 0),
            avgTalkTime: Math.round(avgMetrics.avgTalkTime || 0),
            avgHandleTime: Math.round(avgMetrics.avgHandleTime || 0),
            serviceLevel: serviceLevelPercentage.toFixed(2),
            serviceLevelTarget,
          },
          realtime: {
            callsWaiting,
            // TODO: Add more real-time metrics
          },
        },
      },
    });
  });

  /**
   * POST /
   * Create new queue (admin/supervisor only)
   */
  app.post<{ Body: CreateQueueBody }>(
    '/',
    {
      preHandler: requireRole('admin', 'supervisor'),
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1 },
            strategy: {
              type: 'string',
              enum: ['longest_idle', 'round_robin', 'random', 'fewest_calls', 'skills_based'],
            },
            ringTimeout: { type: 'integer', minimum: 1 },
            maxWaitTime: { type: 'integer', minimum: 1 },
            overflowQueueId: { type: 'string', format: 'uuid' },
            settings: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { name, strategy, ringTimeout, maxWaitTime, overflowQueueId, settings } = request.body;

      // Create queue
      const [newQueue] = await db
        .insert(queues)
        .values({
          name,
          strategy,
          ringTimeout,
          maxWaitTime,
          overflowQueueId,
          settings,
          tenantId: request.user.tenantId,
        })
        .returning();

      return reply.status(201).send({
        success: true,
        data: {
          queue: newQueue,
        },
      });
    }
  );

  /**
   * PUT /:id
   * Update queue (admin/supervisor only)
   */
  app.put<{ Params: { id: string }; Body: UpdateQueueBody }>(
    '/:id',
    { preHandler: requireRole('admin', 'supervisor') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;
      const updates = request.body;

      // Check if queue exists and belongs to same tenant
      const existingQueue = await db.query.queues.findFirst({
        where: and(eq(queues.id, id), eq(queues.tenantId, request.user.tenantId)),
      });

      if (!existingQueue) {
        throw new NotFoundError('Queue not found');
      }

      // Update queue
      const [updatedQueue] = await db
        .update(queues)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(queues.id, id))
        .returning();

      return reply.send({
        success: true,
        data: {
          queue: updatedQueue,
        },
      });
    }
  );
}
