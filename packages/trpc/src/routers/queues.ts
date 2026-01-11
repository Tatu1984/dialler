import { z } from 'zod';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { getDb, queues, calls } from '@nexusdialer/database';
import { router, protectedProcedure, supervisorProcedure, adminProcedure, TRPCError } from '../server';

const db = getDb();

export const queuesRouter = router({
  /**
   * List queues with pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit } = input;
      const offset = (page - 1) * limit;

      const [queueList, [{ total }]] = await Promise.all([
        db.query.queues.findMany({
          where: eq(queues.tenantId, ctx.user.tenantId),
          limit,
          offset,
          orderBy: [desc(queues.createdAt)],
        }),
        db.select({ total: count() }).from(queues).where(eq(queues.tenantId, ctx.user.tenantId)),
      ]);

      return {
        queues: queueList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get queue by ID with statistics
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const queue = await db.query.queues.findFirst({
        where: and(eq(queues.id, input.id), eq(queues.tenantId, ctx.user.tenantId)),
      });

      if (!queue) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Queue not found' });
      }

      return queue;
    }),

  /**
   * Get queue statistics
   */
  getStats: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const queue = await db.query.queues.findFirst({
        where: and(eq(queues.id, input.id), eq(queues.tenantId, ctx.user.tenantId)),
      });

      if (!queue) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Queue not found' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get call statistics for today
      const [callStats] = await db
        .select({
          total: count(),
          answered: sql<number>`COUNT(*) FILTER (WHERE ${calls.answerTime} IS NOT NULL)`,
          abandoned: sql<number>`COUNT(*) FILTER (WHERE ${calls.answerTime} IS NULL AND ${calls.endTime} IS NOT NULL)`,
        })
        .from(calls)
        .where(
          sql`${calls.queueId} = ${input.id} AND ${calls.tenantId} = ${ctx.user.tenantId} AND ${calls.startTime} >= ${today}`
        );

      // Get average metrics
      const [avgMetrics] = await db
        .select({
          avgWaitTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${calls.answerTime} - ${calls.startTime})))`,
          avgTalkTime: sql<number>`AVG(${calls.talkDuration})`,
          avgHandleTime: sql<number>`AVG(${calls.talkDuration} + COALESCE(${calls.wrapDuration}, 0))`,
        })
        .from(calls)
        .where(
          sql`${calls.queueId} = ${input.id} AND ${calls.tenantId} = ${ctx.user.tenantId} AND ${calls.startTime} >= ${today} AND ${calls.answerTime} IS NOT NULL`
        );

      // Calculate service level
      const serviceLevelTarget = (queue.settings as any)?.serviceLevelTarget || 20;
      const [serviceLevel] = await db
        .select({
          withinSL: sql<number>`COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (${calls.answerTime} - ${calls.startTime})) <= ${serviceLevelTarget})`,
          total: sql<number>`COUNT(*)`,
        })
        .from(calls)
        .where(
          sql`${calls.queueId} = ${input.id} AND ${calls.tenantId} = ${ctx.user.tenantId} AND ${calls.startTime} >= ${today} AND ${calls.answerTime} IS NOT NULL`
        );

      const serviceLevelPercentage = serviceLevel.total > 0 ? (serviceLevel.withinSL / serviceLevel.total) * 100 : 0;

      return {
        queueId: input.id,
        queueName: queue.name,
        today: {
          totalCalls: callStats.total,
          answered: callStats.answered,
          abandoned: callStats.abandoned,
          abandonRate: callStats.total > 0 ? ((callStats.abandoned / callStats.total) * 100).toFixed(2) : '0',
          avgWaitTime: Math.round(avgMetrics?.avgWaitTime || 0),
          avgTalkTime: Math.round(avgMetrics?.avgTalkTime || 0),
          avgHandleTime: Math.round(avgMetrics?.avgHandleTime || 0),
          serviceLevel: serviceLevelPercentage.toFixed(2),
          serviceLevelTarget,
        },
      };
    }),

  /**
   * Create new queue
   */
  create: supervisorProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        strategy: z.enum(['longest_idle', 'round_robin', 'random', 'fewest_calls', 'skills_based']).optional(),
        ringTimeout: z.number().min(1).optional(),
        maxWaitTime: z.number().min(1).optional(),
        overflowQueueId: z.string().uuid().optional(),
        settings: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [newQueue] = await db
        .insert(queues)
        .values({
          ...input,
          tenantId: ctx.user.tenantId,
        })
        .returning();

      return newQueue;
    }),

  /**
   * Update queue
   */
  update: supervisorProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        strategy: z.enum(['longest_idle', 'round_robin', 'random', 'fewest_calls', 'skills_based']).optional(),
        ringTimeout: z.number().min(1).optional(),
        maxWaitTime: z.number().min(1).optional(),
        overflowQueueId: z.string().uuid().nullable().optional(),
        settings: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const existing = await db.query.queues.findFirst({
        where: and(eq(queues.id, id), eq(queues.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Queue not found' });
      }

      const [updated] = await db
        .update(queues)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(queues.id, id))
        .returning();

      return updated;
    }),

  /**
   * Delete queue
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.queues.findFirst({
        where: and(eq(queues.id, input.id), eq(queues.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Queue not found' });
      }

      await db.delete(queues).where(eq(queues.id, input.id));

      return { success: true };
    }),
});
