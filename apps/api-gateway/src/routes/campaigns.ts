import type { FastifyInstance } from 'fastify';
import { eq, and, desc, count } from 'drizzle-orm';
import { getDb, campaigns } from '@nexusdialer/database';
import { authenticate, requireRole } from '../middleware/auth';
import { NotFoundError, ForbiddenError, ValidationError } from '../middleware/error-handler';

const db = getDb();

interface CreateCampaignBody {
  name: string;
  type: 'inbound' | 'outbound' | 'blended';
  dialMode?: string;
  settings?: any;
  schedule?: any;
  callerIdId?: string;
}

interface UpdateCampaignBody {
  name?: string;
  type?: 'inbound' | 'outbound' | 'blended';
  dialMode?: string;
  status?: string;
  settings?: any;
  schedule?: any;
  callerIdId?: string;
}

interface ListCampaignsQuery {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}

/**
 * Campaign Management Routes
 */
export async function campaignRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /
   * List campaigns (paginated)
   */
  app.get<{ Querystring: ListCampaignsQuery }>('/', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { page = 1, limit = 20, type, status } = request.query;
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [eq(campaigns.tenantId, request.user.tenantId)];

    if (type) {
      conditions.push(eq(campaigns.type, type));
    }

    if (status) {
      conditions.push(eq(campaigns.status, status));
    }

    // Query campaigns
    const campaignList = await db.query.campaigns.findMany({
      where: and(...conditions),
      limit,
      offset,
      orderBy: [desc(campaigns.createdAt)],
    });

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(campaigns)
      .where(and(...conditions));

    return reply.send({
      success: true,
      data: {
        campaigns: campaignList,
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
   * Get campaign by ID
   */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { id } = request.params;

    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(campaigns.id, id), eq(campaigns.tenantId, request.user.tenantId)),
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    return reply.send({
      success: true,
      data: {
        campaign,
      },
    });
  });

  /**
   * POST /
   * Create new campaign (admin/supervisor only)
   */
  app.post<{ Body: CreateCampaignBody }>(
    '/',
    {
      preHandler: requireRole('admin', 'supervisor'),
      schema: {
        body: {
          type: 'object',
          required: ['name', 'type'],
          properties: {
            name: { type: 'string', minLength: 1 },
            type: { type: 'string', enum: ['inbound', 'outbound', 'blended'] },
            dialMode: {
              type: 'string',
              enum: ['predictive', 'progressive', 'preview', 'power', 'manual'],
            },
            settings: { type: 'object' },
            schedule: { type: 'object' },
            callerIdId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { name, type, dialMode, settings, schedule, callerIdId } = request.body;

      // Create campaign
      const [newCampaign] = await db
        .insert(campaigns)
        .values({
          name,
          type,
          dialMode,
          settings,
          schedule,
          callerIdId,
          tenantId: request.user.tenantId,
          status: 'draft',
        })
        .returning();

      return reply.status(201).send({
        success: true,
        data: {
          campaign: newCampaign,
        },
      });
    }
  );

  /**
   * PUT /:id
   * Update campaign (admin/supervisor only)
   */
  app.put<{ Params: { id: string }; Body: UpdateCampaignBody }>(
    '/:id',
    { preHandler: requireRole('admin', 'supervisor') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;
      const updates = request.body;

      // Check if campaign exists and belongs to same tenant
      const existingCampaign = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, id), eq(campaigns.tenantId, request.user.tenantId)),
      });

      if (!existingCampaign) {
        throw new NotFoundError('Campaign not found');
      }

      // Prevent status changes through this endpoint
      if (updates.status) {
        delete updates.status;
      }

      // Update campaign
      const [updatedCampaign] = await db
        .update(campaigns)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, id))
        .returning();

      return reply.send({
        success: true,
        data: {
          campaign: updatedCampaign,
        },
      });
    }
  );

  /**
   * DELETE /:id
   * Delete campaign (admin only)
   */
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireRole('admin') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;

      // Check if campaign exists and belongs to same tenant
      const existingCampaign = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, id), eq(campaigns.tenantId, request.user.tenantId)),
      });

      if (!existingCampaign) {
        throw new NotFoundError('Campaign not found');
      }

      // Can't delete active campaigns
      if (existingCampaign.status === 'active') {
        throw new ValidationError('Cannot delete an active campaign. Please stop it first.');
      }

      // Delete campaign
      await db.delete(campaigns).where(eq(campaigns.id, id));

      return reply.send({
        success: true,
        data: {
          message: 'Campaign deleted successfully',
        },
      });
    }
  );

  /**
   * POST /:id/start
   * Start campaign (admin/supervisor only)
   */
  app.post<{ Params: { id: string } }>(
    '/:id/start',
    { preHandler: requireRole('admin', 'supervisor') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;

      // Check if campaign exists
      const campaign = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, id), eq(campaigns.tenantId, request.user.tenantId)),
      });

      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }

      // Update campaign status
      const [updatedCampaign] = await db
        .update(campaigns)
        .set({
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, id))
        .returning();

      // TODO: Publish event to start dialer engine

      return reply.send({
        success: true,
        data: {
          campaign: updatedCampaign,
          message: 'Campaign started successfully',
        },
      });
    }
  );

  /**
   * POST /:id/pause
   * Pause campaign (admin/supervisor only)
   */
  app.post<{ Params: { id: string } }>(
    '/:id/pause',
    { preHandler: requireRole('admin', 'supervisor') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;

      // Check if campaign exists
      const campaign = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, id), eq(campaigns.tenantId, request.user.tenantId)),
      });

      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }

      // Update campaign status
      const [updatedCampaign] = await db
        .update(campaigns)
        .set({
          status: 'paused',
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, id))
        .returning();

      // TODO: Publish event to pause dialer engine

      return reply.send({
        success: true,
        data: {
          campaign: updatedCampaign,
          message: 'Campaign paused successfully',
        },
      });
    }
  );

  /**
   * POST /:id/stop
   * Stop campaign (admin/supervisor only)
   */
  app.post<{ Params: { id: string } }>(
    '/:id/stop',
    { preHandler: requireRole('admin', 'supervisor') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;

      // Check if campaign exists
      const campaign = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, id), eq(campaigns.tenantId, request.user.tenantId)),
      });

      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }

      // Update campaign status
      const [updatedCampaign] = await db
        .update(campaigns)
        .set({
          status: 'stopped',
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, id))
        .returning();

      // TODO: Publish event to stop dialer engine

      return reply.send({
        success: true,
        data: {
          campaign: updatedCampaign,
          message: 'Campaign stopped successfully',
        },
      });
    }
  );
}
