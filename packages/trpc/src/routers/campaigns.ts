import { z } from 'zod';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { getDb, campaigns, leads, leadLists, dispositions, calls } from '@nexusdialer/database';
import { router, protectedProcedure, supervisorProcedure, adminProcedure, TRPCError } from '../server';

const db = getDb();

export const campaignsRouter = router({
  /**
   * List campaigns with pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        type: z.enum(['inbound', 'outbound', 'blended']).optional(),
        status: z.enum(['draft', 'active', 'paused', 'stopped']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, type, status } = input;
      const offset = (page - 1) * limit;

      const conditions = [eq(campaigns.tenantId, ctx.user.tenantId)];

      if (type) conditions.push(eq(campaigns.type, type));
      if (status) conditions.push(eq(campaigns.status, status));

      const [campaignList, [{ total }]] = await Promise.all([
        db.query.campaigns.findMany({
          where: and(...conditions),
          limit,
          offset,
          orderBy: [desc(campaigns.createdAt)],
        }),
        db.select({ total: count() }).from(campaigns).where(and(...conditions)),
      ]);

      // Get lead counts and stats for each campaign
      const campaignsWithStats = await Promise.all(
        campaignList.map(async (campaign) => {
          const lists = await db.query.leadLists.findMany({
            where: eq(leadLists.campaignId, campaign.id),
          });

          const totalLeads = lists.reduce((sum, list) => sum + list.totalLeads, 0);

          // Get today's call stats
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const [callStats] = await db
            .select({
              totalCalls: count(),
              answered: sql<number>`COUNT(*) FILTER (WHERE ${calls.answerTime} IS NOT NULL)`,
            })
            .from(calls)
            .where(
              sql`${calls.campaignId} = ${campaign.id} AND ${calls.startTime} >= ${today}`
            );

          return {
            ...campaign,
            stats: {
              totalLeads,
              listCount: lists.length,
              todayCalls: callStats?.totalCalls || 0,
              todayAnswered: callStats?.answered || 0,
            },
          };
        })
      );

      return {
        campaigns: campaignsWithStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get campaign by ID with full details
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, input.id), eq(campaigns.tenantId, ctx.user.tenantId)),
      });

      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      // Get lead lists
      const lists = await db.query.leadLists.findMany({
        where: eq(leadLists.campaignId, campaign.id),
      });

      // Get dispositions
      const campaignDispositions = await db.query.dispositions.findMany({
        where: eq(dispositions.campaignId, campaign.id),
        orderBy: [dispositions.sortOrder],
      });

      // Get call statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayStats] = await db
        .select({
          totalCalls: count(),
          answered: sql<number>`COUNT(*) FILTER (WHERE ${calls.answerTime} IS NOT NULL)`,
          avgTalkTime: sql<number>`AVG(${calls.talkDuration})`,
        })
        .from(calls)
        .where(
          sql`${calls.campaignId} = ${campaign.id} AND ${calls.startTime} >= ${today}`
        );

      return {
        ...campaign,
        leadLists: lists,
        dispositions: campaignDispositions,
        stats: {
          totalLeads: lists.reduce((sum, l) => sum + l.totalLeads, 0),
          todayCalls: todayStats?.totalCalls || 0,
          todayAnswered: todayStats?.answered || 0,
          avgTalkTime: Math.round(todayStats?.avgTalkTime || 0),
        },
      };
    }),

  /**
   * Create new campaign
   */
  create: supervisorProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        type: z.enum(['inbound', 'outbound', 'blended']),
        dialMode: z.enum(['predictive', 'progressive', 'preview', 'power', 'manual']).optional(),
        settings: z.any().optional(),
        schedule: z.any().optional(),
        callerIdId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [newCampaign] = await db
        .insert(campaigns)
        .values({
          ...input,
          tenantId: ctx.user.tenantId,
          status: 'draft',
        })
        .returning();

      return newCampaign;
    }),

  /**
   * Update campaign
   */
  update: supervisorProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        type: z.enum(['inbound', 'outbound', 'blended']).optional(),
        dialMode: z.enum(['predictive', 'progressive', 'preview', 'power', 'manual']).optional(),
        settings: z.any().optional(),
        schedule: z.any().optional(),
        callerIdId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const existing = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, id), eq(campaigns.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      const [updated] = await db
        .update(campaigns)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(campaigns.id, id))
        .returning();

      return updated;
    }),

  /**
   * Delete campaign
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, input.id), eq(campaigns.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      if (existing.status === 'active') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete an active campaign' });
      }

      await db.delete(campaigns).where(eq(campaigns.id, input.id));

      return { success: true };
    }),

  /**
   * Start campaign
   */
  start: supervisorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, input.id), eq(campaigns.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      const [updated] = await db
        .update(campaigns)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(campaigns.id, input.id))
        .returning();

      // TODO: Emit event to start dialer engine

      return updated;
    }),

  /**
   * Pause campaign
   */
  pause: supervisorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, input.id), eq(campaigns.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      const [updated] = await db
        .update(campaigns)
        .set({ status: 'paused', updatedAt: new Date() })
        .where(eq(campaigns.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Stop campaign
   */
  stop: supervisorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, input.id), eq(campaigns.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      const [updated] = await db
        .update(campaigns)
        .set({ status: 'stopped', updatedAt: new Date() })
        .where(eq(campaigns.id, input.id))
        .returning();

      return updated;
    }),
});
