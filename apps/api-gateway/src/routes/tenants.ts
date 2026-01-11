import type { FastifyInstance } from 'fastify';
import { eq, sql, count } from 'drizzle-orm';
import { getDb, tenants, users, campaigns, leads, calls } from '@nexusdialer/database';
import { authenticate, requireRole } from '../middleware/auth';
import { NotFoundError, ForbiddenError } from '../middleware/error-handler';

const db = getDb();

interface UpdateTenantBody {
  name?: string;
  settings?: any;
  subscriptionTier?: string;
  maxAgents?: number;
  status?: string;
}

/**
 * Tenant Management Routes
 */
export async function tenantRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /
   * Get current tenant information
   */
  app.get('/', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, request.user.tenantId),
    });

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    return reply.send({
      success: true,
      data: {
        tenant,
      },
    });
  });

  /**
   * PUT /
   * Update tenant settings (admin only)
   */
  app.put<{ Body: UpdateTenantBody }>(
    '/',
    {
      preHandler: requireRole('admin'),
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            settings: { type: 'object' },
            subscriptionTier: {
              type: 'string',
              enum: ['starter', 'professional', 'enterprise']
            },
            maxAgents: { type: 'integer', minimum: 1 },
            status: { type: 'string', enum: ['active', 'suspended', 'inactive'] },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const updates = request.body;

      // Update tenant
      const [updatedTenant] = await db
        .update(tenants)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, request.user.tenantId))
        .returning();

      return reply.send({
        success: true,
        data: {
          tenant: updatedTenant,
        },
      });
    }
  );

  /**
   * GET /stats
   * Get tenant statistics (admin/supervisor only)
   */
  app.get(
    '/stats',
    { preHandler: requireRole('admin', 'supervisor') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const tenantId = request.user.tenantId;

      // Get user counts
      const [userStats] = await db
        .select({
          total: count(),
          active: sql<number>`COUNT(*) FILTER (WHERE ${users.status} = 'active')`,
          inactive: sql<number>`COUNT(*) FILTER (WHERE ${users.status} = 'inactive')`,
        })
        .from(users)
        .where(eq(users.tenantId, tenantId));

      // Get user counts by role
      const roleStats = await db
        .select({
          role: users.role,
          count: count(),
        })
        .from(users)
        .where(eq(users.tenantId, tenantId))
        .groupBy(users.role);

      // Get campaign counts
      const [campaignStats] = await db
        .select({
          total: count(),
          active: sql<number>`COUNT(*) FILTER (WHERE ${campaigns.status} = 'active')`,
          paused: sql<number>`COUNT(*) FILTER (WHERE ${campaigns.status} = 'paused')`,
          draft: sql<number>`COUNT(*) FILTER (WHERE ${campaigns.status} = 'draft')`,
        })
        .from(campaigns)
        .where(eq(campaigns.tenantId, tenantId));

      // Get lead counts
      const [leadStats] = await db
        .select({
          total: count(),
          new: sql<number>`COUNT(*) FILTER (WHERE ${leads.status} = 'new')`,
          contacted: sql<number>`COUNT(*) FILTER (WHERE ${leads.status} = 'contacted')`,
          qualified: sql<number>`COUNT(*) FILTER (WHERE ${leads.status} = 'qualified')`,
          converted: sql<number>`COUNT(*) FILTER (WHERE ${leads.status} = 'converted')`,
        })
        .from(leads)
        .where(eq(leads.tenantId, tenantId));

      // Get call statistics for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [callStatsToday] = await db
        .select({
          total: count(),
          inbound: sql<number>`COUNT(*) FILTER (WHERE ${calls.direction} = 'inbound')`,
          outbound: sql<number>`COUNT(*) FILTER (WHERE ${calls.direction} = 'outbound')`,
        })
        .from(calls)
        .where(sql`${calls.tenantId} = ${tenantId} AND ${calls.startTime} >= ${today}`);

      // Get average call metrics for today
      const [callMetrics] = await db
        .select({
          avgTalkDuration: sql<number>`AVG(${calls.talkDuration})`,
          avgHoldDuration: sql<number>`AVG(${calls.holdDuration})`,
          avgWrapDuration: sql<number>`AVG(${calls.wrapDuration})`,
        })
        .from(calls)
        .where(
          sql`${calls.tenantId} = ${tenantId} AND ${calls.startTime} >= ${today} AND ${calls.talkDuration} IS NOT NULL`
        );

      return reply.send({
        success: true,
        data: {
          stats: {
            users: {
              ...userStats,
              byRole: roleStats,
            },
            campaigns: campaignStats,
            leads: leadStats,
            callsToday: {
              ...callStatsToday,
              metrics: {
                avgTalkDuration: Math.round(callMetrics.avgTalkDuration || 0),
                avgHoldDuration: Math.round(callMetrics.avgHoldDuration || 0),
                avgWrapDuration: Math.round(callMetrics.avgWrapDuration || 0),
              },
            },
          },
        },
      });
    }
  );
}
