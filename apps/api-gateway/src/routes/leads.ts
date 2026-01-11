import type { FastifyInstance } from 'fastify';
import { eq, and, desc, or, like, count, sql } from 'drizzle-orm';
import { getDb, leads, leadLists } from '@nexusdialer/database';
import { authenticate, requireRole } from '../middleware/auth';
import { NotFoundError, ForbiddenError, ValidationError } from '../middleware/error-handler';

const db = getDb();

interface CreateLeadBody {
  listId: string;
  phoneNumber: string;
  altPhone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  customFields?: any;
  priority?: number;
  timezone?: string;
}

interface UpdateLeadBody {
  phoneNumber?: string;
  altPhone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  customFields?: any;
  status?: string;
  priority?: number;
  timezone?: string;
}

interface ListLeadsQuery {
  page?: number;
  limit?: number;
  listId?: string;
  status?: string;
  search?: string;
  priority?: number;
}

interface ImportLeadsBody {
  listId: string;
  leads: Array<{
    phoneNumber: string;
    altPhone?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    customFields?: any;
  }>;
}

/**
 * Lead Management Routes
 */
export async function leadRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /
   * List leads with filters (paginated)
   */
  app.get<{ Querystring: ListLeadsQuery }>('/', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { page = 1, limit = 20, listId, status, search, priority } = request.query;
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [eq(leads.tenantId, request.user.tenantId)];

    if (listId) {
      conditions.push(eq(leads.listId, listId));
    }

    if (status) {
      conditions.push(eq(leads.status, status));
    }

    if (priority !== undefined) {
      conditions.push(eq(leads.priority, priority));
    }

    if (search) {
      conditions.push(
        or(
          like(leads.phoneNumber, `%${search}%`),
          like(leads.firstName, `%${search}%`),
          like(leads.lastName, `%${search}%`),
          like(leads.email, `%${search}%`),
          like(leads.company, `%${search}%`)
        )!
      );
    }

    // Query leads
    const leadsList = await db.query.leads.findMany({
      where: and(...conditions),
      limit,
      offset,
      orderBy: [desc(leads.priority), desc(leads.createdAt)],
    });

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(leads)
      .where(and(...conditions));

    return reply.send({
      success: true,
      data: {
        leads: leadsList,
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
   * Get lead by ID
   */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { id } = request.params;

    const lead = await db.query.leads.findFirst({
      where: and(eq(leads.id, id), eq(leads.tenantId, request.user.tenantId)),
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    return reply.send({
      success: true,
      data: {
        lead,
      },
    });
  });

  /**
   * POST /
   * Create new lead (admin/supervisor/agent)
   */
  app.post<{ Body: CreateLeadBody }>(
    '/',
    {
      preHandler: requireRole('admin', 'supervisor', 'agent'),
      schema: {
        body: {
          type: 'object',
          required: ['listId', 'phoneNumber'],
          properties: {
            listId: { type: 'string', format: 'uuid' },
            phoneNumber: { type: 'string', minLength: 1 },
            altPhone: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            company: { type: 'string' },
            customFields: { type: 'object' },
            priority: { type: 'integer', minimum: 0 },
            timezone: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { listId, phoneNumber, ...rest } = request.body;

      // Verify list exists and belongs to tenant
      const list = await db.query.leadLists.findFirst({
        where: and(eq(leadLists.id, listId), eq(leadLists.tenantId, request.user.tenantId)),
      });

      if (!list) {
        throw new NotFoundError('Lead list not found');
      }

      // Create lead
      const [newLead] = await db
        .insert(leads)
        .values({
          listId,
          phoneNumber,
          ...rest,
          tenantId: request.user.tenantId,
          status: 'new',
          attemptCount: 0,
        })
        .returning();

      // Update list total count
      await db
        .update(leadLists)
        .set({
          totalLeads: sql`${leadLists.totalLeads} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(leadLists.id, listId));

      return reply.status(201).send({
        success: true,
        data: {
          lead: newLead,
        },
      });
    }
  );

  /**
   * PUT /:id
   * Update lead
   */
  app.put<{ Params: { id: string }; Body: UpdateLeadBody }>(
    '/:id',
    { preHandler: requireRole('admin', 'supervisor', 'agent') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;
      const updates = request.body;

      // Check if lead exists and belongs to same tenant
      const existingLead = await db.query.leads.findFirst({
        where: and(eq(leads.id, id), eq(leads.tenantId, request.user.tenantId)),
      });

      if (!existingLead) {
        throw new NotFoundError('Lead not found');
      }

      // Update lead
      const [updatedLead] = await db
        .update(leads)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, id))
        .returning();

      return reply.send({
        success: true,
        data: {
          lead: updatedLead,
        },
      });
    }
  );

  /**
   * DELETE /:id
   * Delete lead (admin/supervisor only)
   */
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireRole('admin', 'supervisor') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;

      // Check if lead exists and belongs to same tenant
      const existingLead = await db.query.leads.findFirst({
        where: and(eq(leads.id, id), eq(leads.tenantId, request.user.tenantId)),
      });

      if (!existingLead) {
        throw new NotFoundError('Lead not found');
      }

      // Delete lead
      await db.delete(leads).where(eq(leads.id, id));

      // Update list total count
      await db
        .update(leadLists)
        .set({
          totalLeads: sql`${leadLists.totalLeads} - 1`,
          updatedAt: new Date(),
        })
        .where(eq(leadLists.id, existingLead.listId));

      return reply.send({
        success: true,
        data: {
          message: 'Lead deleted successfully',
        },
      });
    }
  );

  /**
   * POST /import
   * Bulk import leads (admin/supervisor only)
   */
  app.post<{ Body: ImportLeadsBody }>(
    '/import',
    {
      preHandler: requireRole('admin', 'supervisor'),
      schema: {
        body: {
          type: 'object',
          required: ['listId', 'leads'],
          properties: {
            listId: { type: 'string', format: 'uuid' },
            leads: {
              type: 'array',
              minItems: 1,
              maxItems: 1000, // Limit batch size
              items: {
                type: 'object',
                required: ['phoneNumber'],
                properties: {
                  phoneNumber: { type: 'string', minLength: 1 },
                  altPhone: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  company: { type: 'string' },
                  customFields: { type: 'object' },
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

      const { listId, leads: leadsToImport } = request.body;

      // Verify list exists and belongs to tenant
      const list = await db.query.leadLists.findFirst({
        where: and(eq(leadLists.id, listId), eq(leadLists.tenantId, request.user.tenantId)),
      });

      if (!list) {
        throw new NotFoundError('Lead list not found');
      }

      // Prepare leads for insertion
      const leadsData = leadsToImport.map((lead) => ({
        ...lead,
        listId,
        tenantId: request.user!.tenantId,
        status: 'new' as const,
        attemptCount: 0,
        customFields: lead.customFields || {},
      }));

      // Insert leads in batch
      const importedLeads = await db.insert(leads).values(leadsData).returning();

      // Update list total count
      await db
        .update(leadLists)
        .set({
          totalLeads: sql`${leadLists.totalLeads} + ${importedLeads.length}`,
          updatedAt: new Date(),
        })
        .where(eq(leadLists.id, listId));

      return reply.status(201).send({
        success: true,
        data: {
          imported: importedLeads.length,
          leads: importedLeads,
          message: `Successfully imported ${importedLeads.length} leads`,
        },
      });
    }
  );
}
