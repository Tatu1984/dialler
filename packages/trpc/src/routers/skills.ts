import { z } from 'zod';
import { eq, and, desc, count } from 'drizzle-orm';
import { getDb, skills, agentProfiles } from '@nexusdialer/database';
import { router, protectedProcedure, supervisorProcedure, adminProcedure, TRPCError } from '../server';

const db = getDb();

export const skillsRouter = router({
  /**
   * List skills
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit } = input;
      const offset = (page - 1) * limit;

      const [skillList, [{ total }]] = await Promise.all([
        db.query.skills.findMany({
          where: eq(skills.tenantId, ctx.user.tenantId),
          limit,
          offset,
          orderBy: [desc(skills.createdAt)],
        }),
        db.select({ total: count() }).from(skills).where(eq(skills.tenantId, ctx.user.tenantId)),
      ]);

      // Count agents with each skill
      const skillsWithCounts = await Promise.all(
        skillList.map(async (skill) => {
          const profiles = await db.query.agentProfiles.findMany({
            where: eq(agentProfiles.tenantId, ctx.user.tenantId),
          });

          const agentCount = profiles.filter((p) => {
            const skillsArr = p.skills as Array<{ skillId: string; level: number }>;
            return skillsArr.some((s) => s.skillId === skill.id);
          }).length;

          return {
            ...skill,
            agentCount,
          };
        })
      );

      return {
        skills: skillsWithCounts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get skill by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const skill = await db.query.skills.findFirst({
        where: and(eq(skills.id, input.id), eq(skills.tenantId, ctx.user.tenantId)),
      });

      if (!skill) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Skill not found' });
      }

      return skill;
    }),

  /**
   * Create new skill
   */
  create: supervisorProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate name
      const existing = await db.query.skills.findFirst({
        where: and(eq(skills.name, input.name), eq(skills.tenantId, ctx.user.tenantId)),
      });

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Skill with this name already exists' });
      }

      const [newSkill] = await db
        .insert(skills)
        .values({
          ...input,
          tenantId: ctx.user.tenantId,
        })
        .returning();

      return newSkill;
    }),

  /**
   * Update skill
   */
  update: supervisorProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const existing = await db.query.skills.findFirst({
        where: and(eq(skills.id, id), eq(skills.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Skill not found' });
      }

      // Check for duplicate name if updating name
      if (updates.name && updates.name !== existing.name) {
        const duplicate = await db.query.skills.findFirst({
          where: and(eq(skills.name, updates.name), eq(skills.tenantId, ctx.user.tenantId)),
        });

        if (duplicate) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Skill with this name already exists' });
        }
      }

      const [updated] = await db
        .update(skills)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(skills.id, id))
        .returning();

      return updated;
    }),

  /**
   * Delete skill
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.skills.findFirst({
        where: and(eq(skills.id, input.id), eq(skills.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Skill not found' });
      }

      await db.delete(skills).where(eq(skills.id, input.id));

      return { success: true };
    }),
});
