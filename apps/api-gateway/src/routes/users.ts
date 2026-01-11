import type { FastifyInstance, FastifyRequest } from 'fastify';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { getDb, users } from '@nexusdialer/database';
import { authenticate, requireRole } from '../middleware/auth';
import { NotFoundError, ValidationError, ForbiddenError } from '../middleware/error-handler';

const db = getDb();

interface CreateUserBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface UpdateUserBody {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
  settings?: any;
}

interface ListUsersQuery {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}

/**
 * User Management Routes
 */
export async function userRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /
   * List users (paginated)
   */
  app.get<{ Querystring: ListUsersQuery }>('/', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { page = 1, limit = 20, role, status, search } = request.query;
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [eq(users.tenantId, request.user.tenantId)];

    if (role) {
      conditions.push(eq(users.role, role));
    }

    if (status) {
      conditions.push(eq(users.status, status));
    }

    // Query users
    const userList = await db.query.users.findMany({
      where: and(...conditions),
      columns: {
        passwordHash: false, // Exclude password
      },
      limit,
      offset,
      orderBy: [desc(users.createdAt)],
    });

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(and(...conditions));

    return reply.send({
      success: true,
      data: {
        users: userList,
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
   * Get user by ID
   */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { id } = request.params;

    const user = await db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.tenantId, request.user.tenantId)),
      columns: {
        passwordHash: false, // Exclude password
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return reply.send({
      success: true,
      data: {
        user,
      },
    });
  });

  /**
   * POST /
   * Create new user (admin/supervisor only)
   */
  app.post<{ Body: CreateUserBody }>(
    '/',
    {
      preHandler: requireRole('admin', 'supervisor'),
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string', minLength: 1 },
            lastName: { type: 'string', minLength: 1 },
            role: { type: 'string', enum: ['admin', 'supervisor', 'agent', 'readonly'] },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { email, password, firstName, lastName, role } = request.body;

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: and(eq(users.email, email), eq(users.tenantId, request.user.tenantId)),
      });

      if (existingUser) {
        throw new ValidationError('User with this email already exists');
      }

      // Hash password
      const passwordHash = await argon2.hash(password);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          passwordHash,
          firstName,
          lastName,
          role,
          tenantId: request.user.tenantId,
          status: 'active',
        })
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          status: users.status,
          tenantId: users.tenantId,
          createdAt: users.createdAt,
        });

      return reply.status(201).send({
        success: true,
        data: {
          user: newUser,
        },
      });
    }
  );

  /**
   * PUT /:id
   * Update user (admin/supervisor only, or self for limited fields)
   */
  app.put<{ Params: { id: string }; Body: UpdateUserBody }>(
    '/:id',
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;
      const updates = request.body;

      // Check if user exists and belongs to same tenant
      const existingUser = await db.query.users.findFirst({
        where: and(eq(users.id, id), eq(users.tenantId, request.user.tenantId)),
      });

      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // Check permissions
      const isSelf = id === request.user.id;
      const isAdmin = request.user.role === 'admin' || request.user.role === 'supervisor';

      // Users can only update their own basic info unless they're admin
      if (!isSelf && !isAdmin) {
        throw new ForbiddenError('Insufficient permissions');
      }

      // Prevent non-admins from changing role or status
      if (!isAdmin && (updates.role || updates.status)) {
        throw new ForbiddenError('Cannot update role or status');
      }

      // Update user
      const [updatedUser] = await db
        .update(users)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          status: users.status,
          settings: users.settings,
          tenantId: users.tenantId,
          updatedAt: users.updatedAt,
        });

      return reply.send({
        success: true,
        data: {
          user: updatedUser,
        },
      });
    }
  );

  /**
   * DELETE /:id
   * Delete user (admin only)
   */
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireRole('admin') },
    async (request, reply) => {
      if (!request.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { id } = request.params;

      // Prevent self-deletion
      if (id === request.user.id) {
        throw new ValidationError('Cannot delete your own account');
      }

      // Check if user exists and belongs to same tenant
      const existingUser = await db.query.users.findFirst({
        where: and(eq(users.id, id), eq(users.tenantId, request.user.tenantId)),
      });

      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // Delete user
      await db.delete(users).where(eq(users.id, id));

      return reply.send({
        success: true,
        data: {
          message: 'User deleted successfully',
        },
      });
    }
  );
}
