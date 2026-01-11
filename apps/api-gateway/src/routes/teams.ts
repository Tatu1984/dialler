import type { FastifyInstance } from 'fastify';
import { eq, and, desc, count } from 'drizzle-orm';
import { getDb, teams, teamMembers, users } from '@nexusdialer/database';
import { authenticate, requireRole } from '../middleware/auth';
import { NotFoundError, ForbiddenError } from '../middleware/error-handler';

const db = getDb();

interface CreateTeamBody {
  name: string;
  managerId?: string;
  settings?: any;
  memberIds?: string[];
}

interface UpdateTeamBody {
  name?: string;
  managerId?: string | null;
  settings?: any;
}

interface ListTeamsQuery {
  page?: number;
  limit?: number;
}

interface AddMembersBody {
  userIds: string[];
}

/**
 * Team Management Routes
 */
export async function teamRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /
   * List teams (paginated)
   */
  app.get<{ Querystring: ListTeamsQuery }>('/', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { page = 1, limit = 20 } = request.query;
    const offset = (page - 1) * limit;

    const teamList = await db.query.teams.findMany({
      where: eq(teams.tenantId, request.user.tenantId),
      limit,
      offset,
      orderBy: [desc(teams.createdAt)],
      with: {
        manager: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Get member counts
    const teamsWithCounts = await Promise.all(
      teamList.map(async (team) => {
        const [{ memberCount }] = await db
          .select({ memberCount: count() })
          .from(teamMembers)
          .where(eq(teamMembers.teamId, team.id));

        return { ...team, memberCount };
      })
    );

    const [{ total }] = await db
      .select({ total: count() })
      .from(teams)
      .where(eq(teams.tenantId, request.user.tenantId));

    return reply.send({
      success: true,
      data: {
        teams: teamsWithCounts,
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
   * Get team by ID with members
   */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { id } = request.params;

    const team = await db.query.teams.findFirst({
      where: and(eq(teams.id, id), eq(teams.tenantId, request.user.tenantId)),
      with: {
        manager: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Get team members
    const members = await db.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, team.id),
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    return reply.send({
      success: true,
      data: {
        ...team,
        members: members.map((m) => m.user),
      },
    });
  });

  /**
   * POST /
   * Create new team (admin/supervisor only)
   */
  app.post<{ Body: CreateTeamBody }>(
    '/',
    {
      preHandler: requireRole('admin', 'supervisor'),
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            managerId: { type: 'string', format: 'uuid' },
            settings: { type: 'object' },
            memberIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { name, managerId, settings, memberIds } = request.body;

      // Create team
      const [newTeam] = await db
        .insert(teams)
        .values({
          name,
          managerId,
          settings: settings || {},
          tenantId: request.user.tenantId,
        })
        .returning();

      // Add members if provided
      if (memberIds && memberIds.length > 0) {
        await db.insert(teamMembers).values(
          memberIds.map((userId) => ({
            teamId: newTeam.id,
            userId,
          }))
        );
      }

      return reply.status(201).send({
        success: true,
        data: {
          team: newTeam,
        },
      });
    }
  );

  /**
   * PUT /:id
   * Update team (admin/supervisor only)
   */
  app.put<{ Params: { id: string }; Body: UpdateTeamBody }>(
    '/:id',
    { preHandler: requireRole('admin', 'supervisor') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;
      const updates = request.body;

      const existing = await db.query.teams.findFirst({
        where: and(eq(teams.id, id), eq(teams.tenantId, request.user.tenantId)),
      });

      if (!existing) {
        throw new NotFoundError('Team not found');
      }

      const [updated] = await db
        .update(teams)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(teams.id, id))
        .returning();

      return reply.send({
        success: true,
        data: {
          team: updated,
        },
      });
    }
  );

  /**
   * DELETE /:id
   * Delete team (admin only)
   */
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireRole('admin') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;

      const existing = await db.query.teams.findFirst({
        where: and(eq(teams.id, id), eq(teams.tenantId, request.user.tenantId)),
      });

      if (!existing) {
        throw new NotFoundError('Team not found');
      }

      await db.delete(teams).where(eq(teams.id, id));

      return reply.send({
        success: true,
        data: {
          message: 'Team deleted successfully',
        },
      });
    }
  );

  /**
   * POST /:id/members
   * Add members to team
   */
  app.post<{ Params: { id: string }; Body: AddMembersBody }>(
    '/:id/members',
    {
      preHandler: requireRole('admin', 'supervisor'),
      schema: {
        body: {
          type: 'object',
          required: ['userIds'],
          properties: {
            userIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;
      const { userIds } = request.body;

      const team = await db.query.teams.findFirst({
        where: and(eq(teams.id, id), eq(teams.tenantId, request.user.tenantId)),
      });

      if (!team) {
        throw new NotFoundError('Team not found');
      }

      // Get existing members
      const existingMembers = await db.query.teamMembers.findMany({
        where: eq(teamMembers.teamId, id),
      });

      const existingUserIds = new Set(existingMembers.map((m) => m.userId));
      const newUserIds = userIds.filter((uid) => !existingUserIds.has(uid));

      if (newUserIds.length > 0) {
        await db.insert(teamMembers).values(
          newUserIds.map((userId) => ({
            teamId: id,
            userId,
          }))
        );
      }

      return reply.send({
        success: true,
        data: {
          added: newUserIds.length,
          message: `Added ${newUserIds.length} members to team`,
        },
      });
    }
  );

  /**
   * DELETE /:id/members/:userId
   * Remove member from team
   */
  app.delete<{ Params: { id: string; userId: string } }>(
    '/:id/members/:userId',
    { preHandler: requireRole('admin', 'supervisor') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id, userId } = request.params;

      const team = await db.query.teams.findFirst({
        where: and(eq(teams.id, id), eq(teams.tenantId, request.user.tenantId)),
      });

      if (!team) {
        throw new NotFoundError('Team not found');
      }

      await db
        .delete(teamMembers)
        .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, userId)));

      return reply.send({
        success: true,
        data: {
          message: 'Member removed from team',
        },
      });
    }
  );
}
