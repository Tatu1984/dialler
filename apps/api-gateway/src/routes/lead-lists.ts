import type { FastifyInstance } from 'fastify';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { getDb, leadLists, leads } from '@nexusdialer/database';
import { authenticate, requireRole } from '../middleware/auth';
import { NotFoundError, ForbiddenError, ValidationError } from '../middleware/error-handler';

const db = getDb();

interface CreateLeadListBody {
  name: string;
  description?: string;
  campaignId?: string;
}

interface UpdateLeadListBody {
  name?: string;
  description?: string | null;
  campaignId?: string | null;
  status?: 'active' | 'inactive' | 'archived';
}

interface ListLeadListsQuery {
  page?: number;
  limit?: number;
  campaignId?: string;
  status?: string;
}

/**
 * Lead Lists Management Routes
 */
export async function leadListRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /
   * List lead lists (paginated)
   */
  app.get<{ Querystring: ListLeadListsQuery }>('/', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { page = 1, limit = 20, campaignId, status } = request.query;
    const offset = (page - 1) * limit;

    const conditions = [eq(leadLists.tenantId, request.user.tenantId)];

    if (campaignId) {
      conditions.push(eq(leadLists.campaignId, campaignId));
    }

    if (status) {
      conditions.push(eq(leadLists.status, status));
    }

    const lists = await db.query.leadLists.findMany({
      where: and(...conditions),
      limit,
      offset,
      orderBy: [desc(leadLists.createdAt)],
    });

    const [{ total }] = await db
      .select({ total: count() })
      .from(leadLists)
      .where(and(...conditions));

    return reply.send({
      success: true,
      data: {
        leadLists: lists,
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
   * Get lead list by ID with stats
   */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { id } = request.params;

    const list = await db.query.leadLists.findFirst({
      where: and(eq(leadLists.id, id), eq(leadLists.tenantId, request.user.tenantId)),
    });

    if (!list) {
      throw new NotFoundError('Lead list not found');
    }

    // Get status breakdown
    const [statusCounts] = await db.execute<{
      new: number;
      contacted: number;
      qualified: number;
      converted: number;
    }>(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'new')::integer as new,
        COUNT(*) FILTER (WHERE status = 'contacted')::integer as contacted,
        COUNT(*) FILTER (WHERE status = 'qualified')::integer as qualified,
        COUNT(*) FILTER (WHERE status = 'converted')::integer as converted
      FROM leads WHERE list_id = $1`,
      [id]
    );

    return reply.send({
      success: true,
      data: {
        ...list,
        statusBreakdown: statusCounts || { new: 0, contacted: 0, qualified: 0, converted: 0 },
      },
    });
  });

  /**
   * POST /
   * Create new lead list (admin/supervisor only)
   */
  app.post<{ Body: CreateLeadListBody }>(
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
            campaignId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { name, description, campaignId } = request.body;

      const [newList] = await db
        .insert(leadLists)
        .values({
          name,
          description,
          campaignId,
          tenantId: request.user.tenantId,
          status: 'active',
          totalLeads: 0,
        })
        .returning();

      return reply.status(201).send({
        success: true,
        data: {
          leadList: newList,
        },
      });
    }
  );

  /**
   * PUT /:id
   * Update lead list (admin/supervisor only)
   */
  app.put<{ Params: { id: string }; Body: UpdateLeadListBody }>(
    '/:id',
    { preHandler: requireRole('admin', 'supervisor') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;
      const updates = request.body;

      const existing = await db.query.leadLists.findFirst({
        where: and(eq(leadLists.id, id), eq(leadLists.tenantId, request.user.tenantId)),
      });

      if (!existing) {
        throw new NotFoundError('Lead list not found');
      }

      const [updated] = await db
        .update(leadLists)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(leadLists.id, id))
        .returning();

      return reply.send({
        success: true,
        data: {
          leadList: updated,
        },
      });
    }
  );

  /**
   * DELETE /:id
   * Delete lead list (admin only)
   */
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireRole('admin') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;

      const existing = await db.query.leadLists.findFirst({
        where: and(eq(leadLists.id, id), eq(leadLists.tenantId, request.user.tenantId)),
      });

      if (!existing) {
        throw new NotFoundError('Lead list not found');
      }

      if (existing.totalLeads > 0) {
        throw new ValidationError(
          'Cannot delete a list with leads. Remove leads first or archive the list.'
        );
      }

      await db.delete(leadLists).where(eq(leadLists.id, id));

      return reply.send({
        success: true,
        data: {
          message: 'Lead list deleted successfully',
        },
      });
    }
  );
}
