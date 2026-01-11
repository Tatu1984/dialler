import { z } from 'zod';
import { eq, and, asc, count } from 'drizzle-orm';
import { getDb, dispositions } from '@nexusdialer/database';
import { router, protectedProcedure, supervisorProcedure, adminProcedure, TRPCError } from '../server';

const db = getDb();

export const dispositionsRouter = router({
  /**
   * List dispositions for a campaign or all
   */
  list: protectedProcedure
    .input(
      z.object({
        campaignId: z.string().uuid().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { campaignId, page, limit } = input;
      const offset = (page - 1) * limit;

      const conditions = [eq(dispositions.tenantId, ctx.user.tenantId)];
      if (campaignId) conditions.push(eq(dispositions.campaignId, campaignId));

      const [dispositionList, [{ total }]] = await Promise.all([
        db.query.dispositions.findMany({
          where: and(...conditions),
          limit,
          offset,
          orderBy: [asc(dispositions.sortOrder), asc(dispositions.name)],
        }),
        db.select({ total: count() }).from(dispositions).where(and(...conditions)),
      ]);

      return {
        dispositions: dispositionList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get disposition by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const disposition = await db.query.dispositions.findFirst({
        where: and(eq(dispositions.id, input.id), eq(dispositions.tenantId, ctx.user.tenantId)),
      });

      if (!disposition) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Disposition not found' });
      }

      return disposition;
    }),

  /**
   * Create new disposition
   */
  create: supervisorProcedure
    .input(
      z.object({
        campaignId: z.string().uuid().optional(),
        code: z.string().min(1).max(20),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        isPositive: z.boolean().default(false),
        requiresCallback: z.boolean().default(false),
        nextAction: z.enum(['none', 'callback', 'recycle', 'dnc']).default('none'),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { isPositive, requiresCallback, ...rest } = input;

      const [newDisposition] = await db
        .insert(dispositions)
        .values({
          ...rest,
          isPositive: isPositive ? 1 : 0,
          requiresCallback: requiresCallback ? 1 : 0,
          tenantId: ctx.user.tenantId,
        })
        .returning();

      return newDisposition;
    }),

  /**
   * Update disposition
   */
  update: supervisorProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        code: z.string().min(1).max(20).optional(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().nullable().optional(),
        isPositive: z.boolean().optional(),
        requiresCallback: z.boolean().optional(),
        nextAction: z.enum(['none', 'callback', 'recycle', 'dnc']).optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, isPositive, requiresCallback, ...rest } = input;

      const existing = await db.query.dispositions.findFirst({
        where: and(eq(dispositions.id, id), eq(dispositions.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Disposition not found' });
      }

      const updates: any = { ...rest, updatedAt: new Date() };
      if (isPositive !== undefined) updates.isPositive = isPositive ? 1 : 0;
      if (requiresCallback !== undefined) updates.requiresCallback = requiresCallback ? 1 : 0;

      const [updated] = await db
        .update(dispositions)
        .set(updates)
        .where(eq(dispositions.id, id))
        .returning();

      return updated;
    }),

  /**
   * Delete disposition
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.dispositions.findFirst({
        where: and(eq(dispositions.id, input.id), eq(dispositions.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Disposition not found' });
      }

      await db.delete(dispositions).where(eq(dispositions.id, input.id));

      return { success: true };
    }),

  /**
   * Reorder dispositions
   */
  reorder: supervisorProcedure
    .input(
      z.object({
        orders: z.array(
          z.object({
            id: z.string().uuid(),
            sortOrder: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.orders.map(async ({ id, sortOrder }) => {
          await db
            .update(dispositions)
            .set({ sortOrder, updatedAt: new Date() })
            .where(and(eq(dispositions.id, id), eq(dispositions.tenantId, ctx.user.tenantId)));
        })
      );

      return { success: true };
    }),
});
