import { z } from 'zod';
import { eq, and, desc, count, or, like } from 'drizzle-orm';
import { getDb, users, agentProfiles, teams, teamMembers, skills } from '@nexusdialer/database';
import { router, protectedProcedure, adminProcedure, supervisorProcedure, TRPCError } from '../server';

const db = getDb();

export const usersRouter = router({
  /**
   * List users with pagination and filtering
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        role: z.enum(['admin', 'supervisor', 'agent', 'readonly']).optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, role, status, search } = input;
      const offset = (page - 1) * limit;

      const conditions = [eq(users.tenantId, ctx.user.tenantId)];

      if (role) {
        conditions.push(eq(users.role, role));
      }

      if (status) {
        conditions.push(eq(users.status, status));
      }

      if (search) {
        conditions.push(
          or(
            like(users.email, `%${search}%`),
            like(users.firstName, `%${search}%`),
            like(users.lastName, `%${search}%`)
          )!
        );
      }

      const [userList, [{ total }]] = await Promise.all([
        db.query.users.findMany({
          where: and(...conditions),
          columns: {
            passwordHash: false,
          },
          limit,
          offset,
          orderBy: [desc(users.createdAt)],
        }),
        db.select({ total: count() }).from(users).where(and(...conditions)),
      ]);

      return {
        users: userList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get user by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: and(eq(users.id, input.id), eq(users.tenantId, ctx.user.tenantId)),
        columns: {
          passwordHash: false,
        },
      });

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      // Get agent profile if exists
      const agentProfile = await db.query.agentProfiles.findFirst({
        where: eq(agentProfiles.userId, user.id),
      });

      // Get team memberships
      const memberships = await db.query.teamMembers.findMany({
        where: eq(teamMembers.userId, user.id),
        with: {
          team: true,
        },
      });

      return {
        ...user,
        agentProfile,
        teams: memberships.map((m) => m.team),
      };
    }),

  /**
   * Create new user
   */
  create: supervisorProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        role: z.enum(['admin', 'supervisor', 'agent', 'readonly']),
        agentNumber: z.string().optional(),
        extension: z.string().optional(),
        teamIds: z.array(z.string().uuid()).optional(),
        skillIds: z.array(z.string().uuid()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { email, password, firstName, lastName, role, agentNumber, extension, teamIds, skillIds } = input;

      // Check if user exists
      const existing = await db.query.users.findFirst({
        where: and(eq(users.email, email), eq(users.tenantId, ctx.user.tenantId)),
      });

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'User with this email already exists' });
      }

      // Hash password (using argon2 - imported dynamically to avoid bundling issues)
      const argon2 = await import('argon2');
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
          tenantId: ctx.user.tenantId,
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

      // Create agent profile if role is agent and agentNumber provided
      if (role === 'agent' && agentNumber) {
        await db.insert(agentProfiles).values({
          userId: newUser.id,
          tenantId: ctx.user.tenantId,
          agentNumber,
          extension,
          skills: skillIds?.map((id) => ({ skillId: id, level: 100 })) || [],
        });
      }

      // Add to teams
      if (teamIds && teamIds.length > 0) {
        await db.insert(teamMembers).values(
          teamIds.map((teamId) => ({
            teamId,
            userId: newUser.id,
          }))
        );
      }

      return newUser;
    }),

  /**
   * Update user
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        email: z.string().email().optional(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        role: z.enum(['admin', 'supervisor', 'agent', 'readonly']).optional(),
        status: z.enum(['active', 'inactive', 'suspended']).optional(),
        settings: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const existing = await db.query.users.findFirst({
        where: and(eq(users.id, id), eq(users.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      // Check permissions - only admins can update role/status
      const isSelf = id === ctx.user.id;
      const isAdmin = ctx.user.role === 'admin' || ctx.user.role === 'supervisor';

      if (!isSelf && !isAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot update other users' });
      }

      if (!isAdmin && (updates.role || updates.status)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot update role or status' });
      }

      const [updated] = await db
        .update(users)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          status: users.status,
          settings: users.settings,
          updatedAt: users.updatedAt,
        });

      return updated;
    }),

  /**
   * Delete user
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete your own account' });
      }

      const existing = await db.query.users.findFirst({
        where: and(eq(users.id, input.id), eq(users.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      await db.delete(users).where(eq(users.id, input.id));

      return { success: true };
    }),

  /**
   * Get current user profile
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
      columns: {
        passwordHash: false,
      },
    });

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }

    return user;
  }),
});
