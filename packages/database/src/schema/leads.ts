import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  integer,
  decimal,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { campaigns } from './campaigns';

export const leadLists = pgTable(
  'lead_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    totalLeads: integer('total_leads').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('lead_lists_tenant_idx').on(table.tenantId),
    index('lead_lists_campaign_idx').on(table.campaignId),
  ]
);

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    listId: uuid('list_id')
      .notNull()
      .references(() => leadLists.id, { onDelete: 'cascade' }),
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
    altPhone: varchar('alt_phone', { length: 20 }),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    email: varchar('email', { length: 255 }),
    company: varchar('company', { length: 255 }),
    customFields: jsonb('custom_fields').default({}).notNull(),
    status: varchar('status', { length: 50 }).default('new').notNull(),
    priority: integer('priority').default(0).notNull(),
    leadScore: decimal('lead_score', { precision: 5, scale: 2 }),
    bestTimeToCall: jsonb('best_time_to_call'),
    timezone: varchar('timezone', { length: 50 }),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
    attemptCount: integer('attempt_count').default(0).notNull(),
    assignedAgentId: uuid('assigned_agent_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('leads_tenant_idx').on(table.tenantId),
    index('leads_list_idx').on(table.listId),
    index('leads_status_idx').on(table.tenantId, table.status),
    index('leads_next_attempt_idx').on(table.tenantId, table.status, table.nextAttemptAt),
    index('leads_phone_idx').on(table.tenantId, table.phoneNumber),
    index('leads_priority_idx').on(table.tenantId, table.listId, table.priority),
  ]
);

export const leadHistory = pgTable(
  'lead_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 50 }).notNull(), // status_change, call, note, etc.
    previousValue: jsonb('previous_value'),
    newValue: jsonb('new_value'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('lead_history_lead_idx').on(table.leadId),
    index('lead_history_created_idx').on(table.createdAt),
  ]
);

export type LeadList = typeof leadLists.$inferSelect;
export type NewLeadList = typeof leadLists.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type LeadHistoryEntry = typeof leadHistory.$inferSelect;
export type NewLeadHistoryEntry = typeof leadHistory.$inferInsert;
