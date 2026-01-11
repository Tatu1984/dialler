import type { FastifyInstance } from 'fastify';
import { eq, and, desc, count, like, gt } from 'drizzle-orm';
import { getDb, dncLists } from '@nexusdialer/database';
import { authenticate, requireRole } from '../middleware/auth';
import { NotFoundError, ForbiddenError, ConflictError } from '../middleware/error-handler';

const db = getDb();

interface AddDncBody {
  phoneNumber: string;
  source?: 'manual' | 'api' | 'import' | 'customer_request';
  reason?: string;
  expiresAt?: string;
}

interface BulkAddDncBody {
  phoneNumbers: string[];
  source?: 'manual' | 'api' | 'import' | 'customer_request';
  reason?: string;
}

interface ListDncQuery {
  page?: number;
  limit?: number;
  search?: string;
  source?: string;
}

/**
 * DNC (Do Not Call) Management Routes
 */
export async function dncRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /
   * List DNC entries (paginated)
   */
  app.get<{ Querystring: ListDncQuery }>('/', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { page = 1, limit = 20, search, source } = request.query;
    const offset = (page - 1) * limit;

    const conditions = [eq(dncLists.tenantId, request.user.tenantId)];

    if (search) {
      conditions.push(like(dncLists.phoneNumber, `%${search}%`));
    }

    if (source) {
      conditions.push(eq(dncLists.source, source));
    }

    const entries = await db.query.dncLists.findMany({
      where: and(...conditions),
      limit,
      offset,
      orderBy: [desc(dncLists.createdAt)],
    });

    const [{ total }] = await db
      .select({ total: count() })
      .from(dncLists)
      .where(and(...conditions));

    return reply.send({
      success: true,
      data: {
        entries,
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
   * GET /check/:phoneNumber
   * Check if phone number is on DNC list
   */
  app.get<{ Params: { phoneNumber: string } }>('/check/:phoneNumber', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { phoneNumber } = request.params;

    const entry = await db.query.dncLists.findFirst({
      where: and(
        eq(dncLists.phoneNumber, phoneNumber),
        eq(dncLists.tenantId, request.user.tenantId)
      ),
    });

    // Check if expired
    if (entry?.expiresAt && new Date(entry.expiresAt) < new Date()) {
      return reply.send({
        success: true,
        data: {
          onDnc: false,
          expired: true,
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        onDnc: !!entry,
        entry: entry || null,
      },
    });
  });

  /**
   * POST /
   * Add phone number to DNC list (admin/supervisor only)
   */
  app.post<{ Body: AddDncBody }>(
    '/',
    {
      preHandler: requireRole('admin', 'supervisor'),
      schema: {
        body: {
          type: 'object',
          required: ['phoneNumber'],
          properties: {
            phoneNumber: { type: 'string', minLength: 1 },
            source: { type: 'string', enum: ['manual', 'api', 'import', 'customer_request'] },
            reason: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { phoneNumber, source = 'manual', reason, expiresAt } = request.body;

      // Check if already exists
      const existing = await db.query.dncLists.findFirst({
        where: and(
          eq(dncLists.phoneNumber, phoneNumber),
          eq(dncLists.tenantId, request.user.tenantId)
        ),
      });

      if (existing) {
        throw new ConflictError('Phone number already on DNC list');
      }

      const [newEntry] = await db
        .insert(dncLists)
        .values({
          phoneNumber,
          source,
          reason,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          tenantId: request.user.tenantId,
        })
        .returning();

      return reply.status(201).send({
        success: true,
        data: {
          entry: newEntry,
        },
      });
    }
  );

  /**
   * POST /bulk
   * Bulk add phone numbers to DNC list (admin/supervisor only)
   */
  app.post<{ Body: BulkAddDncBody }>(
    '/bulk',
    {
      preHandler: requireRole('admin', 'supervisor'),
      schema: {
        body: {
          type: 'object',
          required: ['phoneNumbers'],
          properties: {
            phoneNumbers: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
              minItems: 1,
              maxItems: 1000,
            },
            source: { type: 'string', enum: ['manual', 'api', 'import', 'customer_request'] },
            reason: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { phoneNumbers, source = 'import', reason } = request.body;

      // Get existing numbers
      const existingEntries = await db.query.dncLists.findMany({
        where: eq(dncLists.tenantId, request.user.tenantId),
        columns: { phoneNumber: true },
      });

      const existingNumbers = new Set(existingEntries.map((e) => e.phoneNumber));
      const newNumbers = phoneNumbers.filter((num) => !existingNumbers.has(num));

      if (newNumbers.length === 0) {
        return reply.send({
          success: true,
          data: {
            added: 0,
            skipped: phoneNumbers.length,
            message: 'All numbers already on DNC list',
          },
        });
      }

      // Insert new numbers
      await db.insert(dncLists).values(
        newNumbers.map((phoneNumber) => ({
          phoneNumber,
          source,
          reason,
          tenantId: request.user!.tenantId,
        }))
      );

      return reply.status(201).send({
        success: true,
        data: {
          added: newNumbers.length,
          skipped: phoneNumbers.length - newNumbers.length,
          message: `Added ${newNumbers.length} numbers to DNC list`,
        },
      });
    }
  );

  /**
   * DELETE /:id
   * Remove entry from DNC list (admin only)
   */
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireRole('admin') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;

      const existing = await db.query.dncLists.findFirst({
        where: and(eq(dncLists.id, id), eq(dncLists.tenantId, request.user.tenantId)),
      });

      if (!existing) {
        throw new NotFoundError('DNC entry not found');
      }

      await db.delete(dncLists).where(eq(dncLists.id, id));

      return reply.send({
        success: true,
        data: {
          message: 'DNC entry removed successfully',
        },
      });
    }
  );

  /**
   * DELETE /by-number/:phoneNumber
   * Remove by phone number from DNC list (admin only)
   */
  app.delete<{ Params: { phoneNumber: string } }>(
    '/by-number/:phoneNumber',
    { preHandler: requireRole('admin') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { phoneNumber } = request.params;

      const deleted = await db
        .delete(dncLists)
        .where(
          and(eq(dncLists.phoneNumber, phoneNumber), eq(dncLists.tenantId, request.user.tenantId))
        )
        .returning();

      if (deleted.length === 0) {
        throw new NotFoundError('Phone number not on DNC list');
      }

      return reply.send({
        success: true,
        data: {
          message: 'Phone number removed from DNC list',
        },
      });
    }
  );

  /**
   * POST /cleanup
   * Clean up expired DNC entries (admin only)
   */
  app.post(
    '/cleanup',
    { preHandler: requireRole('admin') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const now = new Date();

      const deleted = await db
        .delete(dncLists)
        .where(and(eq(dncLists.tenantId, request.user.tenantId), gt(now, dncLists.expiresAt!)))
        .returning();

      return reply.send({
        success: true,
        data: {
          removed: deleted.length,
          message: `Removed ${deleted.length} expired DNC entries`,
        },
      });
    }
  );
}
