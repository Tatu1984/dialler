import { z } from 'zod';
import { eq, and, desc, count } from 'drizzle-orm';
import { getDb, teams, teamMembers, users } from '@nexusdialer/database';
import { router, protectedProcedure, supervisorProcedure, adminProcedure, TRPCError } from '../server';

const db = getDb();

export const teamsRouter = router({
  /**
   * List teams with pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit } = input;
      const offset = (page - 1) * limit;

      const [teamList, [{ total }]] = await Promise.all([
        db.query.teams.findMany({
          where: eq(teams.tenantId, ctx.user.tenantId),
          limit,
          offset,
          orderBy: [desc(teams.createdAt)],
          with: {
            manager: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        db.select({ total: count() }).from(teams).where(eq(teams.tenantId, ctx.user.tenantId)),
      ]);

      // Get member counts for each team
      const teamsWithCounts = await Promise.all(
        teamList.map(async (team) => {
          const [{ memberCount }] = await db
            .select({ memberCount: count() })
            .from(teamMembers)
            .where(eq(teamMembers.teamId, team.id));

          return {
            ...team,
            memberCount,
          };
        })
      );

      return {
        teams: teamsWithCounts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get team by ID with members
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const team = await db.query.teams.findFirst({
        where: and(eq(teams.id, input.id), eq(teams.tenantId, ctx.user.tenantId)),
        with: {
          manager: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      // Get team members
      const members = await db.query.teamMembers.findMany({
        where: eq(teamMembers.teamId, team.id),
        with: {
          user: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      });

      return {
        ...team,
        members: members.map((m) => m.user),
      };
    }),

  /**
   * Create new team
   */
  create: supervisorProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        managerId: z.string().uuid().optional(),
        settings: z.any().optional(),
        memberIds: z.array(z.string().uuid()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, managerId, settings, memberIds } = input;

      // Create team
      const [newTeam] = await db
        .insert(teams)
        .values({
          name,
          managerId,
          settings: settings || {},
          tenantId: ctx.user.tenantId,
        })
        .returning();

      // Add members if provided
      if (memberIds && memberIds.length > 0) {
        await db.insert(teamMembers).values(
          memberIds.map((userId) => ({
            teamId: newTeam.id,
            userId,
          }))
        );
      }

      return newTeam;
    }),

  /**
   * Update team
   */
  update: supervisorProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        managerId: z.string().uuid().nullable().optional(),
        settings: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const existing = await db.query.teams.findFirst({
        where: and(eq(teams.id, id), eq(teams.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      const [updated] = await db
        .update(teams)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(teams.id, id))
        .returning();

      return updated;
    }),

  /**
   * Delete team
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.teams.findFirst({
        where: and(eq(teams.id, input.id), eq(teams.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      await db.delete(teams).where(eq(teams.id, input.id));

      return { success: true };
    }),

  /**
   * Add members to team
   */
  addMembers: supervisorProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        userIds: z.array(z.string().uuid()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { teamId, userIds } = input;

      // Verify team exists
      const team = await db.query.teams.findFirst({
        where: and(eq(teams.id, teamId), eq(teams.tenantId, ctx.user.tenantId)),
      });

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      // Get existing members to avoid duplicates
      const existingMembers = await db.query.teamMembers.findMany({
        where: eq(teamMembers.teamId, teamId),
      });

      const existingUserIds = new Set(existingMembers.map((m) => m.userId));
      const newUserIds = userIds.filter((id) => !existingUserIds.has(id));

      if (newUserIds.length > 0) {
        await db.insert(teamMembers).values(
          newUserIds.map((userId) => ({
            teamId,
            userId,
          }))
        );
      }

      return { added: newUserIds.length };
    }),

  /**
   * Remove member from team
   */
  removeMember: supervisorProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        userId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { teamId, userId } = input;

      // Verify team exists
      const team = await db.query.teams.findFirst({
        where: and(eq(teams.id, teamId), eq(teams.tenantId, ctx.user.tenantId)),
      });

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      await db
        .delete(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

      return { success: true };
    }),
});
