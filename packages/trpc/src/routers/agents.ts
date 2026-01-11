import { z } from 'zod';
import { eq, and, desc, count, isNull, gte } from 'drizzle-orm';
import { getDb, users, agentProfiles, agentStates, calls, callbackSchedules } from '@nexusdialer/database';
import { router, protectedProcedure, supervisorProcedure, agentProcedure, TRPCError } from '../server';

const db = getDb();

export const agentsRouter = router({
  /**
   * List agents with their current state
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        state: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, state } = input;
      const offset = (page - 1) * limit;

      // Get agents with their profiles
      const agentsList = await db.query.users.findMany({
        where: and(eq(users.tenantId, ctx.user.tenantId), eq(users.role, 'agent')),
        columns: {
          passwordHash: false,
        },
        limit,
        offset,
        orderBy: [desc(users.createdAt)],
      });

      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(users)
        .where(and(eq(users.tenantId, ctx.user.tenantId), eq(users.role, 'agent')));

      // Get agent profiles and current states
      const agentsWithStates = await Promise.all(
        agentsList.map(async (agent) => {
          const profile = await db.query.agentProfiles.findFirst({
            where: eq(agentProfiles.userId, agent.id),
          });

          // Get current state (most recent with no end time)
          const currentState = await db.query.agentStates.findFirst({
            where: and(eq(agentStates.agentId, agent.id), isNull(agentStates.endedAt)),
            orderBy: [desc(agentStates.startedAt)],
          });

          return {
            ...agent,
            agentProfile: profile,
            currentState: currentState?.state || 'offline',
            stateReason: currentState?.reason,
            stateStartedAt: currentState?.startedAt,
          };
        })
      );

      // Filter by state if requested
      const filteredAgents = state
        ? agentsWithStates.filter((a) => a.currentState === state)
        : agentsWithStates;

      return {
        agents: filteredAgents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get agent details with today's statistics
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const agent = await db.query.users.findFirst({
        where: and(eq(users.id, input.id), eq(users.tenantId, ctx.user.tenantId)),
        columns: {
          passwordHash: false,
        },
      });

      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
      }

      const profile = await db.query.agentProfiles.findFirst({
        where: eq(agentProfiles.userId, agent.id),
      });

      // Get current state
      const currentState = await db.query.agentStates.findFirst({
        where: and(eq(agentStates.agentId, agent.id), isNull(agentStates.endedAt)),
        orderBy: [desc(agentStates.startedAt)],
      });

      // Get today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [{ totalCalls }] = await db
        .select({ totalCalls: count() })
        .from(calls)
        .where(and(eq(calls.agentId, agent.id), gte(calls.startTime, today)));

      // Get pending callbacks
      const [{ pendingCallbacks }] = await db
        .select({ pendingCallbacks: count() })
        .from(callbackSchedules)
        .where(
          and(
            eq(callbackSchedules.agentId, agent.id),
            eq(callbackSchedules.status, 'pending'),
            eq(callbackSchedules.callbackType, 'agent_specific')
          )
        );

      return {
        ...agent,
        agentProfile: profile,
        currentState: currentState?.state || 'offline',
        stateReason: currentState?.reason,
        stateStartedAt: currentState?.startedAt,
        todayStats: {
          totalCalls,
          answeredCalls: 0,
          avgTalkTime: 0,
          totalTalkTime: 0,
          pendingCallbacks,
        },
      };
    }),

  /**
   * Update agent profile
   */
  updateProfile: supervisorProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        agentNumber: z.string().optional(),
        extension: z.string().nullable().optional(),
        skills: z.array(z.object({ skillId: z.string().uuid(), level: z.number().min(0).max(100) })).optional(),
        maxConcurrentChats: z.number().min(1).optional(),
        webrtcEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, ...updates } = input;

      // Verify user exists
      const user = await db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.tenantId, ctx.user.tenantId)),
      });

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      // Check if profile exists
      const existingProfile = await db.query.agentProfiles.findFirst({
        where: eq(agentProfiles.userId, userId),
      });

      if (existingProfile) {
        // Update existing
        const [updated] = await db
          .update(agentProfiles)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(agentProfiles.userId, userId))
          .returning();

        return updated;
      } else {
        // Create new profile
        if (!updates.agentNumber) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Agent number is required for new profile' });
        }

        const [created] = await db
          .insert(agentProfiles)
          .values({
            userId,
            tenantId: ctx.user.tenantId,
            agentNumber: updates.agentNumber,
            extension: updates.extension,
            skills: updates.skills || [],
            maxConcurrentChats: updates.maxConcurrentChats || 3,
            webrtcEnabled: updates.webrtcEnabled ?? true,
          })
          .returning();

        return created;
      }
    }),

  /**
   * Update agent state
   */
  updateState: agentProcedure
    .input(
      z.object({
        state: z.enum(['available', 'on_call', 'wrap_up', 'break', 'lunch', 'training', 'meeting', 'offline']),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Close current state (set ended_at)
      const now = new Date();

      await db
        .update(agentStates)
        .set({ endedAt: now })
        .where(and(eq(agentStates.agentId, ctx.user.id), isNull(agentStates.endedAt)));

      // Create new state
      const [newState] = await db
        .insert(agentStates)
        .values({
          tenantId: ctx.user.tenantId,
          agentId: ctx.user.id,
          state: input.state,
          reason: input.reason,
          startedAt: now,
        })
        .returning();

      return newState;
    }),

  /**
   * Get my callbacks (for agents)
   */
  myCallbacks: agentProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'completed']).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { status, page, limit } = input;
      const offset = (page - 1) * limit;

      const conditions = [
        eq(callbackSchedules.agentId, ctx.user.id),
        eq(callbackSchedules.tenantId, ctx.user.tenantId),
      ];

      if (status) {
        conditions.push(eq(callbackSchedules.status, status));
      }

      const [callbacks, [{ total }]] = await Promise.all([
        db.query.callbackSchedules.findMany({
          where: and(...conditions),
          limit,
          offset,
          orderBy: [desc(callbackSchedules.scheduledAt)],
        }),
        db.select({ total: count() }).from(callbackSchedules).where(and(...conditions)),
      ]);

      return {
        callbacks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Dashboard metrics for supervisors
   */
  dashboard: supervisorProcedure.query(async ({ ctx }) => {
    // Get total agents
    const [{ totalAgents }] = await db
      .select({ totalAgents: count() })
      .from(users)
      .where(and(eq(users.tenantId, ctx.user.tenantId), eq(users.role, 'agent')));

    // Get active agent states (agents currently in a state)
    const activeStates = await db.query.agentStates.findMany({
      where: and(
        eq(agentStates.tenantId, ctx.user.tenantId),
        isNull(agentStates.endedAt)
      ),
      columns: { state: true, agentId: true },
    });

    // Count agents per state
    const stateCounts: Record<string, number> = {};
    const seenAgents = new Set<string>();
    for (const state of activeStates) {
      if (!seenAgents.has(state.agentId)) {
        seenAgents.add(state.agentId);
        stateCounts[state.state] = (stateCounts[state.state] || 0) + 1;
      }
    }

    // Agents not in active states are offline
    const offlineCount = totalAgents - seenAgents.size;

    // Get today's call count
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ todayCalls }] = await db
      .select({ todayCalls: count() })
      .from(calls)
      .where(and(eq(calls.tenantId, ctx.user.tenantId), gte(calls.startTime, today)));

    return {
      agentsByState: {
        available: stateCounts['available'] || 0,
        on_call: stateCounts['on_call'] || 0,
        wrap_up: stateCounts['wrap_up'] || 0,
        break: stateCounts['break'] || 0,
        lunch: stateCounts['lunch'] || 0,
        training: stateCounts['training'] || 0,
        meeting: stateCounts['meeting'] || 0,
        offline: offlineCount,
        total: totalAgents,
      },
      todayMetrics: {
        totalCalls: todayCalls,
        answeredCalls: 0,
        avgWaitTime: 0,
        avgTalkTime: 0,
      },
    };
  }),
});
