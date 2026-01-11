import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { getDb, users, tenants, agentProfiles } from '@nexusdialer/database';
import { authenticate, requireRole } from '../middleware/auth.js';
import { NotFoundError, generateAgentNumber, generateExtension } from '@nexusdialer/utils';
import * as argon2 from 'argon2';

// Request schemas
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['admin', 'supervisor', 'agent', 'readonly']),
  createAgentProfile: z.boolean().optional().default(true),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'supervisor', 'agent', 'readonly']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

const listUsersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  role: z.enum(['admin', 'supervisor', 'agent', 'readonly']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  search: z.string().optional(),
});

export async function userRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/users
   * List users in tenant
   */
  app.get(
    '/',
    { preHandler: [requireRole('admin', 'supervisor')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listUsersSchema.parse(request.query);
      const db = getDb();
      const tenantId = request.user.tenantId;

      // Build query
      const offset = (query.page - 1) * query.limit;

      const userList = await db.query.users.findMany({
        where: eq(users.tenantId, tenantId),
        limit: query.limit,
        offset,
        orderBy: (users, { desc }) => [desc(users.createdAt)],
      });

      const total = userList.length; // TODO: implement proper count

      return reply.send({
        success: true,
        data: userList.map((u) => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          status: u.status,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt,
        })),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    }
  );

  /**
   * GET /api/v1/users/:userId
   * Get user by ID
   */
  app.get(
    '/:userId',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { userId: string } }>,
      reply: FastifyReply
    ) => {
      const { userId } = request.params;
      const db = getDb();

      // Users can view their own profile, admins/supervisors can view others
      if (
        userId !== request.user.userId &&
        !['admin', 'supervisor'].includes(request.user.role)
      ) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        });
      }

      const user = await db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.tenantId, request.user.tenantId)),
      });

      if (!user) {
        throw new NotFoundError('User', userId);
      }

      // Get agent profile if exists
      const profile = await db.query.agentProfiles.findFirst({
        where: eq(agentProfiles.userId, userId),
      });

      return reply.send({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          settings: user.settings,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          agentProfile: profile
            ? {
                id: profile.id,
                agentNumber: profile.agentNumber,
                extension: profile.extension,
                skills: profile.skills,
                maxConcurrentChats: profile.maxConcurrentChats,
                webrtcEnabled: profile.webrtcEnabled,
              }
            : null,
        },
      });
    }
  );

  /**
   * POST /api/v1/users
   * Create a new user
   */
  app.post(
    '/',
    { preHandler: [requireRole('admin')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createUserSchema.parse(request.body);
      const db = getDb();
      const tenantId = request.user.tenantId;

      // Check if email exists
      const existing = await db.query.users.findFirst({
        where: and(eq(users.tenantId, tenantId), eq(users.email, body.email.toLowerCase())),
      });

      if (existing) {
        return reply.status(409).send({
          success: false,
          error: { code: 'CONFLICT', message: 'Email already exists' },
        });
      }

      // Hash password if provided
      let passwordHash: string | undefined;
      if (body.password) {
        passwordHash = await argon2.hash(body.password, {
          type: argon2.argon2id,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
        });
      }

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          tenantId,
          email: body.email.toLowerCase(),
          passwordHash,
          firstName: body.firstName,
          lastName: body.lastName,
          role: body.role,
          status: 'active',
        })
        .returning();

      // Create agent profile if role is agent and requested
      let profile = null;
      if (body.role === 'agent' && body.createAgentProfile) {
        const [newProfile] = await db
          .insert(agentProfiles)
          .values({
            userId: newUser.id,
            tenantId,
            agentNumber: generateAgentNumber(),
            extension: generateExtension(),
          })
          .returning();
        profile = newProfile;
      }

      return reply.status(201).send({
        success: true,
        data: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          status: newUser.status,
          createdAt: newUser.createdAt,
          agentProfile: profile
            ? {
                id: profile.id,
                agentNumber: profile.agentNumber,
                extension: profile.extension,
              }
            : null,
        },
      });
    }
  );

  /**
   * PATCH /api/v1/users/:userId
   * Update user
   */
  app.patch(
    '/:userId',
    { preHandler: [requireRole('admin')] },
    async (
      request: FastifyRequest<{ Params: { userId: string } }>,
      reply: FastifyReply
    ) => {
      const { userId } = request.params;
      const body = updateUserSchema.parse(request.body);
      const db = getDb();

      const user = await db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.tenantId, request.user.tenantId)),
      });

      if (!user) {
        throw new NotFoundError('User', userId);
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      return reply.send({
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          status: updatedUser.status,
          updatedAt: updatedUser.updatedAt,
        },
      });
    }
  );

  /**
   * DELETE /api/v1/users/:userId
   * Deactivate user (soft delete)
   */
  app.delete(
    '/:userId',
    { preHandler: [requireRole('admin')] },
    async (
      request: FastifyRequest<{ Params: { userId: string } }>,
      reply: FastifyReply
    ) => {
      const { userId } = request.params;
      const db = getDb();

      // Can't delete yourself
      if (userId === request.user.userId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Cannot delete your own account' },
        });
      }

      const user = await db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.tenantId, request.user.tenantId)),
      });

      if (!user) {
        throw new NotFoundError('User', userId);
      }

      // Soft delete by setting status to inactive
      await db
        .update(users)
        .set({
          status: 'inactive',
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return reply.send({
        success: true,
        data: { message: 'User deactivated successfully' },
      });
    }
  );
}
