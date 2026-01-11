import type { FastifyInstance } from 'fastify';
import { eq, and, desc, count } from 'drizzle-orm';
import { getDb, skills, agentProfiles } from '@nexusdialer/database';
import { authenticate, requireRole } from '../middleware/auth';
import { NotFoundError, ForbiddenError, ConflictError } from '../middleware/error-handler';

const db = getDb();

interface CreateSkillBody {
  name: string;
  description?: string;
}

interface UpdateSkillBody {
  name?: string;
  description?: string | null;
}

interface ListSkillsQuery {
  page?: number;
  limit?: number;
}

/**
 * Skills Management Routes
 */
export async function skillRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /
   * List skills (paginated)
   */
  app.get<{ Querystring: ListSkillsQuery }>('/', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { page = 1, limit = 50 } = request.query;
    const offset = (page - 1) * limit;

    const skillList = await db.query.skills.findMany({
      where: eq(skills.tenantId, request.user.tenantId),
      limit,
      offset,
      orderBy: [desc(skills.createdAt)],
    });

    // Count agents with each skill
    const profiles = await db.query.agentProfiles.findMany({
      where: eq(agentProfiles.tenantId, request.user.tenantId),
    });

    const skillsWithCounts = skillList.map((skill) => {
      const agentCount = profiles.filter((p) => {
        const skillsArr = p.skills as Array<{ skillId: string; level: number }>;
        return skillsArr.some((s) => s.skillId === skill.id);
      }).length;

      return { ...skill, agentCount };
    });

    const [{ total }] = await db
      .select({ total: count() })
      .from(skills)
      .where(eq(skills.tenantId, request.user.tenantId));

    return reply.send({
      success: true,
      data: {
        skills: skillsWithCounts,
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
   * Get skill by ID
   */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { id } = request.params;

    const skill = await db.query.skills.findFirst({
      where: and(eq(skills.id, id), eq(skills.tenantId, request.user.tenantId)),
    });

    if (!skill) {
      throw new NotFoundError('Skill not found');
    }

    return reply.send({
      success: true,
      data: {
        skill,
      },
    });
  });

  /**
   * POST /
   * Create new skill (admin/supervisor only)
   */
  app.post<{ Body: CreateSkillBody }>(
    '/',
    {
      preHandler: requireRole('admin', 'supervisor'),
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { name, description } = request.body;

      // Check for duplicate
      const existing = await db.query.skills.findFirst({
        where: and(eq(skills.name, name), eq(skills.tenantId, request.user.tenantId)),
      });

      if (existing) {
        throw new ConflictError('Skill with this name already exists');
      }

      const [newSkill] = await db
        .insert(skills)
        .values({
          name,
          description,
          tenantId: request.user.tenantId,
        })
        .returning();

      return reply.status(201).send({
        success: true,
        data: {
          skill: newSkill,
        },
      });
    }
  );

  /**
   * PUT /:id
   * Update skill (admin/supervisor only)
   */
  app.put<{ Params: { id: string }; Body: UpdateSkillBody }>(
    '/:id',
    { preHandler: requireRole('admin', 'supervisor') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;
      const updates = request.body;

      const existing = await db.query.skills.findFirst({
        where: and(eq(skills.id, id), eq(skills.tenantId, request.user.tenantId)),
      });

      if (!existing) {
        throw new NotFoundError('Skill not found');
      }

      // Check for duplicate name if updating
      if (updates.name && updates.name !== existing.name) {
        const duplicate = await db.query.skills.findFirst({
          where: and(eq(skills.name, updates.name), eq(skills.tenantId, request.user.tenantId)),
        });

        if (duplicate) {
          throw new ConflictError('Skill with this name already exists');
        }
      }

      const [updated] = await db
        .update(skills)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(skills.id, id))
        .returning();

      return reply.send({
        success: true,
        data: {
          skill: updated,
        },
      });
    }
  );

  /**
   * DELETE /:id
   * Delete skill (admin only)
   */
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireRole('admin') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;

      const existing = await db.query.skills.findFirst({
        where: and(eq(skills.id, id), eq(skills.tenantId, request.user.tenantId)),
      });

      if (!existing) {
        throw new NotFoundError('Skill not found');
      }

      await db.delete(skills).where(eq(skills.id, id));

      return reply.send({
        success: true,
        data: {
          message: 'Skill deleted successfully',
        },
      });
    }
  );
}
