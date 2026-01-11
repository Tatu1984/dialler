import { z } from 'zod';
import { eq, and, desc, count } from 'drizzle-orm';
import { getDb, leadLists, leads } from '@nexusdialer/database';
import { router, protectedProcedure, supervisorProcedure, adminProcedure, TRPCError } from '../server';

const db = getDb();

export const leadListsRouter = router({
  /**
   * List lead lists with pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        campaignId: z.string().uuid().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, campaignId, status } = input;
      const offset = (page - 1) * limit;

      const conditions = [eq(leadLists.tenantId, ctx.user.tenantId)];

      if (campaignId) conditions.push(eq(leadLists.campaignId, campaignId));
      if (status) conditions.push(eq(leadLists.status, status));

      const [lists, [{ total }]] = await Promise.all([
        db.query.leadLists.findMany({
          where: and(...conditions),
          limit,
          offset,
          orderBy: [desc(leadLists.createdAt)],
        }),
        db.select({ total: count() }).from(leadLists).where(and(...conditions)),
      ]);

      return {
        leadLists: lists,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get lead list by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const list = await db.query.leadLists.findFirst({
        where: and(eq(leadLists.id, input.id), eq(leadLists.tenantId, ctx.user.tenantId)),
      });

      if (!list) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead list not found' });
      }

      // Get lead counts
      const [{ leadCount }] = await db
        .select({ leadCount: count() })
        .from(leads)
        .where(eq(leads.listId, list.id));

      return {
        ...list,
        leadCount,
      };
    }),

  /**
   * Create new lead list
   */
  create: supervisorProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        campaignId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [newList] = await db
        .insert(leadLists)
        .values({
          ...input,
          tenantId: ctx.user.tenantId,
          status: 'active',
          totalLeads: 0,
        })
        .returning();

      return newList;
    }),

  /**
   * Update lead list
   */
  update: supervisorProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().nullable().optional(),
        campaignId: z.string().uuid().nullable().optional(),
        status: z.enum(['active', 'inactive', 'archived']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const existing = await db.query.leadLists.findFirst({
        where: and(eq(leadLists.id, id), eq(leadLists.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead list not found' });
      }

      const [updated] = await db
        .update(leadLists)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(leadLists.id, id))
        .returning();

      return updated;
    }),

  /**
   * Delete lead list
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.leadLists.findFirst({
        where: and(eq(leadLists.id, input.id), eq(leadLists.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead list not found' });
      }

      if (existing.totalLeads > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete a list with leads. Remove leads first or archive the list.',
        });
      }

      await db.delete(leadLists).where(eq(leadLists.id, input.id));

      return { success: true };
    }),
});
