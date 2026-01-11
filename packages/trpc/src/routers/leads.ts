import { z } from 'zod';
import { eq, and, desc, count, or, like, sql } from 'drizzle-orm';
import { getDb, leads, leadLists, leadHistory, dncLists } from '@nexusdialer/database';
import { router, protectedProcedure, supervisorProcedure, agentProcedure, TRPCError } from '../server';

const db = getDb();

export const leadsRouter = router({
  /**
   * List leads with pagination and filtering
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        listId: z.string().uuid().optional(),
        status: z.string().optional(),
        priority: z.number().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, listId, status, priority, search } = input;
      const offset = (page - 1) * limit;

      const conditions = [eq(leads.tenantId, ctx.user.tenantId)];

      if (listId) conditions.push(eq(leads.listId, listId));
      if (status) conditions.push(eq(leads.status, status));
      if (priority !== undefined) conditions.push(eq(leads.priority, priority));

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

      const [leadList, [{ total }]] = await Promise.all([
        db.query.leads.findMany({
          where: and(...conditions),
          limit,
          offset,
          orderBy: [desc(leads.priority), desc(leads.createdAt)],
        }),
        db.select({ total: count() }).from(leads).where(and(...conditions)),
      ]);

      return {
        leads: leadList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get lead by ID with history
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const lead = await db.query.leads.findFirst({
        where: and(eq(leads.id, input.id), eq(leads.tenantId, ctx.user.tenantId)),
      });

      if (!lead) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }

      // Get history
      const history = await db.query.leadHistory.findMany({
        where: eq(leadHistory.leadId, lead.id),
        orderBy: [desc(leadHistory.createdAt)],
        limit: 50,
      });

      return {
        ...lead,
        history,
      };
    }),

  /**
   * Create new lead
   */
  create: agentProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        phoneNumber: z.string().min(1),
        altPhone: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        company: z.string().optional(),
        customFields: z.any().optional(),
        priority: z.number().optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { listId, phoneNumber, ...rest } = input;

      // Verify list exists
      const list = await db.query.leadLists.findFirst({
        where: and(eq(leadLists.id, listId), eq(leadLists.tenantId, ctx.user.tenantId)),
      });

      if (!list) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead list not found' });
      }

      // Check DNC
      const dncEntry = await db.query.dncLists.findFirst({
        where: and(eq(dncLists.phoneNumber, phoneNumber), eq(dncLists.tenantId, ctx.user.tenantId)),
      });

      if (dncEntry) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Phone number is on DNC list' });
      }

      // Create lead
      const [newLead] = await db
        .insert(leads)
        .values({
          listId,
          phoneNumber,
          ...rest,
          tenantId: ctx.user.tenantId,
          status: 'new',
          attemptCount: 0,
          customFields: rest.customFields || {},
        })
        .returning();

      // Update list count
      await db
        .update(leadLists)
        .set({
          totalLeads: sql`${leadLists.totalLeads} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(leadLists.id, listId));

      return newLead;
    }),

  /**
   * Update lead
   */
  update: agentProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        phoneNumber: z.string().optional(),
        altPhone: z.string().nullable().optional(),
        firstName: z.string().nullable().optional(),
        lastName: z.string().nullable().optional(),
        email: z.string().email().nullable().optional(),
        company: z.string().nullable().optional(),
        customFields: z.any().optional(),
        status: z.string().optional(),
        priority: z.number().optional(),
        timezone: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const existing = await db.query.leads.findFirst({
        where: and(eq(leads.id, id), eq(leads.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }

      // Record history if status changed
      if (updates.status && updates.status !== existing.status) {
        await db.insert(leadHistory).values({
          tenantId: ctx.user.tenantId,
          leadId: id,
          eventType: 'status_change',
          previousValue: { status: existing.status },
          newValue: { status: updates.status },
          createdBy: ctx.user.id,
        });
      }

      const [updated] = await db
        .update(leads)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(leads.id, id))
        .returning();

      return updated;
    }),

  /**
   * Delete lead
   */
  delete: supervisorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.leads.findFirst({
        where: and(eq(leads.id, input.id), eq(leads.tenantId, ctx.user.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }

      await db.delete(leads).where(eq(leads.id, input.id));

      // Update list count
      await db
        .update(leadLists)
        .set({
          totalLeads: sql`${leadLists.totalLeads} - 1`,
          updatedAt: new Date(),
        })
        .where(eq(leadLists.id, existing.listId));

      return { success: true };
    }),

  /**
   * Bulk import leads
   */
  import: supervisorProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        leads: z.array(
          z.object({
            phoneNumber: z.string().min(1),
            altPhone: z.string().optional(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().email().optional(),
            company: z.string().optional(),
            customFields: z.any().optional(),
          })
        ).min(1).max(1000),
        skipDnc: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { listId, leads: leadsToImport, skipDnc } = input;

      // Verify list exists
      const list = await db.query.leadLists.findFirst({
        where: and(eq(leadLists.id, listId), eq(leadLists.tenantId, ctx.user.tenantId)),
      });

      if (!list) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead list not found' });
      }

      // Get DNC numbers if checking
      let dncNumbers = new Set<string>();
      if (!skipDnc) {
        const dncEntries = await db.query.dncLists.findMany({
          where: eq(dncLists.tenantId, ctx.user.tenantId),
          columns: { phoneNumber: true },
        });
        dncNumbers = new Set(dncEntries.map((e) => e.phoneNumber));
      }

      // Filter out DNC numbers
      const validLeads = leadsToImport.filter((lead) => !dncNumbers.has(lead.phoneNumber));
      const skippedCount = leadsToImport.length - validLeads.length;

      if (validLeads.length === 0) {
        return {
          imported: 0,
          skipped: skippedCount,
          message: 'All leads were on DNC list',
        };
      }

      // Prepare leads for insertion
      const leadsData = validLeads.map((lead) => ({
        ...lead,
        listId,
        tenantId: ctx.user.tenantId,
        status: 'new' as const,
        attemptCount: 0,
        customFields: lead.customFields || {},
      }));

      // Insert leads
      const importedLeads = await db.insert(leads).values(leadsData).returning();

      // Update list count
      await db
        .update(leadLists)
        .set({
          totalLeads: sql`${leadLists.totalLeads} + ${importedLeads.length}`,
          updatedAt: new Date(),
        })
        .where(eq(leadLists.id, listId));

      return {
        imported: importedLeads.length,
        skipped: skippedCount,
        message: `Successfully imported ${importedLeads.length} leads${skippedCount > 0 ? `, skipped ${skippedCount} DNC numbers` : ''}`,
      };
    }),
});
