import type { FastifyInstance } from 'fastify';
import { eq, and, asc, count } from 'drizzle-orm';
import { getDb, dispositions } from '@nexusdialer/database';
import { authenticate, requireRole } from '../middleware/auth';
import { NotFoundError, ForbiddenError } from '../middleware/error-handler';

const db = getDb();

interface CreateDispositionBody {
  campaignId?: string;
  code: string;
  name: string;
  description?: string;
  isPositive?: boolean;
  requiresCallback?: boolean;
  nextAction?: 'none' | 'callback' | 'recycle' | 'dnc';
  sortOrder?: number;
}

interface UpdateDispositionBody {
  code?: string;
  name?: string;
  description?: string | null;
  isPositive?: boolean;
  requiresCallback?: boolean;
  nextAction?: 'none' | 'callback' | 'recycle' | 'dnc';
  sortOrder?: number;
}

interface ListDispositionsQuery {
  page?: number;
  limit?: number;
  campaignId?: string;
}

/**
 * Dispositions Management Routes
 */
export async function dispositionRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /
   * List dispositions (paginated)
   */
  app.get<{ Querystring: ListDispositionsQuery }>('/', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { page = 1, limit = 50, campaignId } = request.query;
    const offset = (page - 1) * limit;

    const conditions = [eq(dispositions.tenantId, request.user.tenantId)];

    if (campaignId) {
      conditions.push(eq(dispositions.campaignId, campaignId));
    }

    const dispositionList = await db.query.dispositions.findMany({
      where: and(...conditions),
      limit,
      offset,
      orderBy: [asc(dispositions.sortOrder), asc(dispositions.name)],
    });

    const [{ total }] = await db
      .select({ total: count() })
      .from(dispositions)
      .where(and(...conditions));

    return reply.send({
      success: true,
      data: {
        dispositions: dispositionList,
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
   * Get disposition by ID
   */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { id } = request.params;

    const disposition = await db.query.dispositions.findFirst({
      where: and(eq(dispositions.id, id), eq(dispositions.tenantId, request.user.tenantId)),
    });

    if (!disposition) {
      throw new NotFoundError('Disposition not found');
    }

    return reply.send({
      success: true,
      data: {
        disposition,
      },
    });
  });

  /**
   * POST /
   * Create new disposition (admin/supervisor only)
   */
  app.post<{ Body: CreateDispositionBody }>(
    '/',
    {
      preHandler: requireRole('admin', 'supervisor'),
      schema: {
        body: {
          type: 'object',
          required: ['code', 'name'],
          properties: {
            campaignId: { type: 'string', format: 'uuid' },
            code: { type: 'string', minLength: 1, maxLength: 20 },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string' },
            isPositive: { type: 'boolean' },
            requiresCallback: { type: 'boolean' },
            nextAction: { type: 'string', enum: ['none', 'callback', 'recycle', 'dnc'] },
            sortOrder: { type: 'integer' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { isPositive, requiresCallback, ...rest } = request.body;

      const [newDisposition] = await db
        .insert(dispositions)
        .values({
          ...rest,
          isPositive: isPositive ? 1 : 0,
          requiresCallback: requiresCallback ? 1 : 0,
          tenantId: request.user.tenantId,
        })
        .returning();

      return reply.status(201).send({
        success: true,
        data: {
          disposition: newDisposition,
        },
      });
    }
  );

  /**
   * PUT /:id
   * Update disposition (admin/supervisor only)
   */
  app.put<{ Params: { id: string }; Body: UpdateDispositionBody }>(
    '/:id',
    { preHandler: requireRole('admin', 'supervisor') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;
      const { isPositive, requiresCallback, ...rest } = request.body;

      const existing = await db.query.dispositions.findFirst({
        where: and(eq(dispositions.id, id), eq(dispositions.tenantId, request.user.tenantId)),
      });

      if (!existing) {
        throw new NotFoundError('Disposition not found');
      }

      const updates: any = { ...rest, updatedAt: new Date() };
      if (isPositive !== undefined) updates.isPositive = isPositive ? 1 : 0;
      if (requiresCallback !== undefined) updates.requiresCallback = requiresCallback ? 1 : 0;

      const [updated] = await db
        .update(dispositions)
        .set(updates)
        .where(eq(dispositions.id, id))
        .returning();

      return reply.send({
        success: true,
        data: {
          disposition: updated,
        },
      });
    }
  );

  /**
   * DELETE /:id
   * Delete disposition (admin only)
   */
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireRole('admin') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;

      const existing = await db.query.dispositions.findFirst({
        where: and(eq(dispositions.id, id), eq(dispositions.tenantId, request.user.tenantId)),
      });

      if (!existing) {
        throw new NotFoundError('Disposition not found');
      }

      await db.delete(dispositions).where(eq(dispositions.id, id));

      return reply.send({
        success: true,
        data: {
          message: 'Disposition deleted successfully',
        },
      });
    }
  );

  /**
   * POST /reorder
   * Reorder dispositions (admin/supervisor only)
   */
  app.post<{ Body: { orders: Array<{ id: string; sortOrder: number }> } }>(
    '/reorder',
    {
      preHandler: requireRole('admin', 'supervisor'),
      schema: {
        body: {
          type: 'object',
          required: ['orders'],
          properties: {
            orders: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'sortOrder'],
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  sortOrder: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      await Promise.all(
        request.body.orders.map(async ({ id, sortOrder }) => {
          await db
            .update(dispositions)
            .set({ sortOrder, updatedAt: new Date() })
            .where(and(eq(dispositions.id, id), eq(dispositions.tenantId, request.user!.tenantId)));
        })
      );

      return reply.send({
        success: true,
        data: {
          message: 'Dispositions reordered successfully',
        },
      });
    }
  );
}
