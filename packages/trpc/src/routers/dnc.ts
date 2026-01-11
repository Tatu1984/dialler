import { z } from 'zod';
import { eq, and, desc, count, like, lt, isNotNull } from 'drizzle-orm';
import { getDb, dncLists } from '@nexusdialer/database';
import { router, protectedProcedure, supervisorProcedure, adminProcedure, TRPCError } from '../server';

const db = getDb();

export const dncRouter = router({
  /**
   * List DNC entries with pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        source: z.enum(['manual', 'api', 'import', 'customer_request']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, source } = input;
      const offset = (page - 1) * limit;

      const conditions = [eq(dncLists.tenantId, ctx.user.tenantId)];

      if (search) {
        conditions.push(like(dncLists.phoneNumber, `%${search}%`));
      }

      if (source) {
        conditions.push(eq(dncLists.source, source));
      }

      const [dncEntries, [{ total }]] = await Promise.all([
        db.query.dncLists.findMany({
          where: and(...conditions),
          limit,
          offset,
          orderBy: [desc(dncLists.createdAt)],
        }),
        db.select({ total: count() }).from(dncLists).where(and(...conditions)),
      ]);

      return {
        entries: dncEntries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Check if phone number is on DNC list
   */
  check: protectedProcedure
    .input(z.object({ phoneNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      const entry = await db.query.dncLists.findFirst({
        where: and(
          eq(dncLists.phoneNumber, input.phoneNumber),
          eq(dncLists.tenantId, ctx.user.tenantId)
        ),
      });

      // Check if expired
      if (entry?.expiresAt && new Date(entry.expiresAt) < new Date()) {
        return { onDnc: false, expired: true };
      }

      return {
        onDnc: !!entry,
        entry: entry || null,
      };
    }),

  /**
   * Add phone number to DNC list
   */
  add: supervisorProcedure
    .input(
      z.object({
        phoneNumber: z.string().min(1),
        source: z.enum(['manual', 'api', 'import', 'customer_request']).default('manual'),
        reason: z.string().optional(),
        expiresAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already exists
      const existing = await db.query.dncLists.findFirst({
        where: and(
          eq(dncLists.phoneNumber, input.phoneNumber),
          eq(dncLists.tenantId, ctx.user.tenantId)
        ),
      });

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Phone number already on DNC list' });
      }

      const [newEntry] = await db
        .insert(dncLists)
        .values({
          ...input,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          tenantId: ctx.user.tenantId,
        })
        .returning();

      return newEntry;
    }),

  /**
   * Bulk add phone numbers to DNC list
   */
  bulkAdd: supervisorProcedure
    .input(
      z.object({
        phoneNumbers: z.array(z.string().min(1)).min(1).max(1000),
        source: z.enum(['manual', 'api', 'import', 'customer_request']).default('import'),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { phoneNumbers, source, reason } = input;

      // Get existing numbers to avoid duplicates
      const existingEntries = await db.query.dncLists.findMany({
        where: eq(dncLists.tenantId, ctx.user.tenantId),
        columns: { phoneNumber: true },
      });

      const existingNumbers = new Set(existingEntries.map((e) => e.phoneNumber));
      const newNumbers = phoneNumbers.filter((num) => !existingNumbers.has(num));

      if (newNumbers.length === 0) {
        return {
          added: 0,
          skipped: phoneNumbers.length,
          message: 'All numbers already on DNC list',
        };
      }

      // Insert new numbers
      await db.insert(dncLists).values(
        newNumbers.map((phoneNumber) => ({
          phoneNumber,
          source,
          reason,
          tenantId: ctx.user.tenantId,
        }))
      );

      return {
        added: newNumbers.length,
        skipped: phoneNumbers.length - newNumbers.length,
        message: `Added ${newNumbers.length} numbers to DNC list`,
      };
    }),

  /**
   * Remove phone number from DNC list
   */
  remove: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.dncLists.findFirst({
        where: and(eq(dncLists.id, input.id), eq(dncLists.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'DNC entry not found' });
      }

      await db.delete(dncLists).where(eq(dncLists.id, input.id));

      return { success: true };
    }),

  /**
   * Remove phone number by number from DNC list
   */
  removeByNumber: adminProcedure
    .input(z.object({ phoneNumber: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db
        .delete(dncLists)
        .where(
          and(eq(dncLists.phoneNumber, input.phoneNumber), eq(dncLists.tenantId, ctx.user.tenantId))
        )
        .returning();

      if (deleted.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Phone number not on DNC list' });
      }

      return { success: true };
    }),

  /**
   * Clean up expired DNC entries
   */
  cleanupExpired: adminProcedure.mutation(async ({ ctx }) => {
    const now = new Date();

    const deleted = await db
      .delete(dncLists)
      .where(
        and(
          eq(dncLists.tenantId, ctx.user.tenantId),
          isNotNull(dncLists.expiresAt),
          lt(dncLists.expiresAt, now)
        )
      )
      .returning();

    return {
      removed: deleted.length,
      message: `Removed ${deleted.length} expired DNC entries`,
    };
  }),
});
