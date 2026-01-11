import type { FastifyInstance } from 'fastify';
import { eq, and, desc, count } from 'drizzle-orm';
import { getDb, scripts } from '@nexusdialer/database';
import { authenticate, requireRole } from '../middleware/auth';
import { NotFoundError, ForbiddenError } from '../middleware/error-handler';

const db = getDb();

interface CreateScriptBody {
  name: string;
  description?: string;
  content?: any;
}

interface UpdateScriptBody {
  name?: string;
  description?: string | null;
  content?: any;
  status?: 'draft' | 'published';
  version?: string;
}

interface ListScriptsQuery {
  page?: number;
  limit?: number;
  status?: string;
}

/**
 * Scripts Management Routes
 */
export async function scriptRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /
   * List scripts (paginated)
   */
  app.get<{ Querystring: ListScriptsQuery }>('/', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { page = 1, limit = 20, status } = request.query;
    const offset = (page - 1) * limit;

    const conditions = [eq(scripts.tenantId, request.user.tenantId)];

    if (status) {
      conditions.push(eq(scripts.status, status));
    }

    const items = await db.query.scripts.findMany({
      where: and(...conditions),
      limit,
      offset,
      orderBy: [desc(scripts.createdAt)],
    });

    const [{ total }] = await db
      .select({ total: count() })
      .from(scripts)
      .where(and(...conditions));

    return reply.send({
      success: true,
      data: {
        items,
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
   * Get script by ID
   */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { id } = request.params;

    const script = await db.query.scripts.findFirst({
      where: and(eq(scripts.id, id), eq(scripts.tenantId, request.user.tenantId)),
    });

    if (!script) {
      throw new NotFoundError('Script not found');
    }

    return reply.send({
      success: true,
      data: {
        script,
      },
    });
  });

  /**
   * POST /
   * Create new script (admin/supervisor only)
   */
  app.post<{ Body: CreateScriptBody }>(
    '/',
    {
      preHandler: requireRole('admin', 'supervisor'),
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            content: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { name, description, content } = request.body;

      const [newScript] = await db
        .insert(scripts)
        .values({
          name,
          description,
          content: content || {},
          tenantId: request.user.tenantId,
          createdBy: request.user.id,
          status: 'draft',
          version: '1.0',
        })
        .returning();

      return reply.status(201).send({
        success: true,
        data: {
          script: newScript,
        },
      });
    }
  );

  /**
   * PUT /:id
   * Update script (admin/supervisor only)
   */
  app.put<{ Params: { id: string }; Body: UpdateScriptBody }>(
    '/:id',
    { preHandler: requireRole('admin', 'supervisor') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;
      const updates = request.body;

      const existing = await db.query.scripts.findFirst({
        where: and(eq(scripts.id, id), eq(scripts.tenantId, request.user.tenantId)),
      });

      if (!existing) {
        throw new NotFoundError('Script not found');
      }

      const [updated] = await db
        .update(scripts)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(scripts.id, id))
        .returning();

      return reply.send({
        success: true,
        data: {
          script: updated,
        },
      });
    }
  );

  /**
   * DELETE /:id
   * Delete script (admin only)
   */
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireRole('admin') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;

      const existing = await db.query.scripts.findFirst({
        where: and(eq(scripts.id, id), eq(scripts.tenantId, request.user.tenantId)),
      });

      if (!existing) {
        throw new NotFoundError('Script not found');
      }

      await db.delete(scripts).where(eq(scripts.id, id));

      return reply.send({
        success: true,
        data: {
          message: 'Script deleted successfully',
        },
      });
    }
  );
}
