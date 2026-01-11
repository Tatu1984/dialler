import type { FastifyInstance } from 'fastify';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { getDb, users, agentProfiles, agentStates, calls } from '@nexusdialer/database';
import { authenticate, requireRole } from '../middleware/auth';
import { NotFoundError, ForbiddenError, ValidationError } from '../middleware/error-handler';

const db = getDb();

interface UpdateAgentStateBody {
  state: string;
  reason?: string;
}

interface ListAgentsQuery {
  page?: number;
  limit?: number;
  state?: string;
  role?: string;
}

/**
 * Agent Status Management Routes
 */
export async function agentRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /
   * List agents with their current states
   */
  app.get<{ Querystring: ListAgentsQuery }>('/', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { page = 1, limit = 50, state, role } = request.query;
    const offset = (page - 1) * limit;

    // Build query to get agents with their current state
    const agentsQuery = db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        status: users.status,
        agentNumber: agentProfiles.agentNumber,
        extension: agentProfiles.extension,
        skills: agentProfiles.skills,
        maxConcurrentChats: agentProfiles.maxConcurrentChats,
        webrtcEnabled: agentProfiles.webrtcEnabled,
        currentState: sql<string>`(
          SELECT ${agentStates.state}
          FROM ${agentStates}
          WHERE ${agentStates.agentId} = ${users.id}
            AND ${agentStates.endedAt} IS NULL
          ORDER BY ${agentStates.startedAt} DESC
          LIMIT 1
        )`,
        currentStateReason: sql<string>`(
          SELECT ${agentStates.reason}
          FROM ${agentStates}
          WHERE ${agentStates.agentId} = ${users.id}
            AND ${agentStates.endedAt} IS NULL
          ORDER BY ${agentStates.startedAt} DESC
          LIMIT 1
        )`,
        currentStateStartedAt: sql<Date>`(
          SELECT ${agentStates.startedAt}
          FROM ${agentStates}
          WHERE ${agentStates.agentId} = ${users.id}
            AND ${agentStates.endedAt} IS NULL
          ORDER BY ${agentStates.startedAt} DESC
          LIMIT 1
        )`,
      })
      .from(users)
      .leftJoin(agentProfiles, eq(users.id, agentProfiles.userId))
      .where(
        and(
          eq(users.tenantId, request.user.tenantId),
          role ? eq(users.role, role) : sql`${users.role} IN ('agent', 'supervisor', 'admin')`
        )
      )
      .limit(limit)
      .offset(offset)
      .orderBy(users.firstName, users.lastName);

    const agentsList = await agentsQuery;

    // Filter by state if provided
    let filteredAgents = agentsList;
    if (state) {
      filteredAgents = agentsList.filter((agent) => agent.currentState === state);
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(
        and(
          eq(users.tenantId, request.user.tenantId),
          role ? eq(users.role, role) : sql`${users.role} IN ('agent', 'supervisor', 'admin')`
        )
      );

    return reply.send({
      success: true,
      data: {
        agents: filteredAgents,
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
   * Get agent details with current state and statistics
   */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { id } = request.params;

    // Get agent details
    const agent = await db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.tenantId, request.user.tenantId)),
      columns: {
        passwordHash: false,
      },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // Get agent profile
    const profile = await db.query.agentProfiles.findFirst({
      where: eq(agentProfiles.userId, id),
    });

    // Get current state
    const currentState = await db.query.agentStates.findFirst({
      where: and(eq(agentStates.agentId, id), sql`${agentStates.endedAt} IS NULL`),
      orderBy: [desc(agentStates.startedAt)],
    });

    // Get today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [callStats] = await db
      .select({
        totalCalls: count(),
        totalTalkTime: sql<number>`SUM(${calls.talkDuration})`,
        totalWrapTime: sql<number>`SUM(${calls.wrapDuration})`,
        avgTalkTime: sql<number>`AVG(${calls.talkDuration})`,
      })
      .from(calls)
      .where(
        and(
          eq(calls.agentId, id),
          eq(calls.tenantId, request.user.tenantId),
          sql`${calls.startTime} >= ${today}`
        )
      );

    // Get state history for today
    const stateHistory = await db
      .select({
        state: agentStates.state,
        totalDuration: sql<number>`SUM(${agentStates.duration})`,
      })
      .from(agentStates)
      .where(
        and(
          eq(agentStates.agentId, id),
          eq(agentStates.tenantId, request.user.tenantId),
          sql`${agentStates.startedAt} >= ${today}`
        )
      )
      .groupBy(agentStates.state);

    return reply.send({
      success: true,
      data: {
        agent: {
          ...agent,
          profile,
          currentState: currentState || null,
        },
        statistics: {
          today: {
            calls: {
              total: callStats.totalCalls,
              totalTalkTime: callStats.totalTalkTime || 0,
              totalWrapTime: callStats.totalWrapTime || 0,
              avgTalkTime: Math.round(callStats.avgTalkTime || 0),
            },
            states: stateHistory,
          },
        },
      },
    });
  });

  /**
   * GET /:id/state
   * Get agent's current state
   */
  app.get<{ Params: { id: string } }>('/:id/state', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { id } = request.params;

    // Verify agent exists and belongs to tenant
    const agent = await db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.tenantId, request.user.tenantId)),
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // Get current state
    const currentState = await db.query.agentStates.findFirst({
      where: and(eq(agentStates.agentId, id), sql`${agentStates.endedAt} IS NULL`),
      orderBy: [desc(agentStates.startedAt)],
    });

    return reply.send({
      success: true,
      data: {
        agentId: id,
        currentState: currentState || null,
      },
    });
  });

  /**
   * POST /:id/state
   * Update agent state (available, break, lunch, offline, etc.)
   */
  app.post<{ Params: { id: string }; Body: UpdateAgentStateBody }>(
    '/:id/state',
    {
      schema: {
        body: {
          type: 'object',
          required: ['state'],
          properties: {
            state: {
              type: 'string',
              enum: [
                'available',
                'on_call',
                'wrap_up',
                'break',
                'lunch',
                'training',
                'meeting',
                'offline',
              ],
            },
            reason: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;
      const { state, reason } = request.body;

      // Check permissions: agents can only update their own state
      const isAdmin = request.user.role === 'admin' || request.user.role === 'supervisor';
      if (id !== request.user.id && !isAdmin) {
        throw new ForbiddenError('Can only update your own state');
      }

      // Verify agent exists and belongs to tenant
      const agent = await db.query.users.findFirst({
        where: and(eq(users.id, id), eq(users.tenantId, request.user.tenantId)),
      });

      if (!agent) {
        throw new NotFoundError('Agent not found');
      }

      // End current state if exists
      const currentState = await db.query.agentStates.findFirst({
        where: and(eq(agentStates.agentId, id), sql`${agentStates.endedAt} IS NULL`),
        orderBy: [desc(agentStates.startedAt)],
      });

      if (currentState) {
        const endTime = new Date();
        const duration = Math.floor(
          (endTime.getTime() - new Date(currentState.startedAt).getTime()) / 1000
        );

        await db
          .update(agentStates)
          .set({
            endedAt: endTime,
            duration,
          })
          .where(eq(agentStates.id, currentState.id));
      }

      // Create new state
      const [newState] = await db
        .insert(agentStates)
        .values({
          agentId: id,
          tenantId: request.user.tenantId,
          state,
          reason,
          startedAt: new Date(),
        })
        .returning();

      return reply.send({
        success: true,
        data: {
          state: newState,
          message: `Agent state updated to ${state}`,
        },
      });
    }
  );

  /**
   * GET /dashboard
   * Get real-time agent dashboard data (admin/supervisor only)
   */
  app.get(
    '/dashboard',
    { preHandler: requireRole('admin', 'supervisor') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const tenantId = request.user.tenantId;

      // Get agent state summary
      const stateSummary = await db
        .select({
          state: agentStates.state,
          count: count(),
        })
        .from(agentStates)
        .innerJoin(users, eq(agentStates.agentId, users.id))
        .where(
          and(
            eq(users.tenantId, tenantId),
            sql`${agentStates.endedAt} IS NULL`,
            sql`${users.role} IN ('agent', 'supervisor')`
          )
        )
        .groupBy(agentStates.state);

      // Get total agents
      const [{ totalAgents }] = await db
        .select({ totalAgents: count() })
        .from(users)
        .where(and(eq(users.tenantId, tenantId), sql`${users.role} IN ('agent', 'supervisor')`));

      // Get today's call statistics by agent
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const topAgents = await db
        .select({
          agentId: calls.agentId,
          agentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          totalCalls: count(),
          totalTalkTime: sql<number>`SUM(${calls.talkDuration})`,
          avgTalkTime: sql<number>`AVG(${calls.talkDuration})`,
        })
        .from(calls)
        .innerJoin(users, eq(calls.agentId, users.id))
        .where(
          and(
            eq(calls.tenantId, tenantId),
            sql`${calls.startTime} >= ${today}`,
            sql`${calls.agentId} IS NOT NULL`
          )
        )
        .groupBy(calls.agentId, sql`${users.firstName} || ' ' || ${users.lastName}`)
        .orderBy(desc(count()))
        .limit(10);

      return reply.send({
        success: true,
        data: {
          summary: {
            totalAgents,
            byState: stateSummary,
          },
          topAgents: topAgents.map((agent) => ({
            ...agent,
            avgTalkTime: Math.round(agent.avgTalkTime || 0),
          })),
        },
      });
    }
  );
}
