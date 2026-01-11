import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // inbound, outbound, blended
    dialMode: varchar('dial_mode', { length: 50 }), // predictive, progressive, preview, power, manual
    status: varchar('status', { length: 20 }).default('draft').notNull(),
    settings: jsonb('settings')
      .default({
        dialRatio: 1.5,
        ringTimeout: 30,
        maxAttempts: 5,
        retryInterval: 3600,
        amdEnabled: true,
        amdAction: 'hangup',
        wrapUpTime: 30,
        priorityWeight: 50,
      })
      .notNull(),
    schedule: jsonb('schedule')
      .default({
        enabled: true,
        timezone: 'America/New_York',
        hours: {},
      })
      .notNull(),
    callerIdId: uuid('caller_id_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('campaigns_tenant_idx').on(table.tenantId),
    index('campaigns_tenant_status_idx').on(table.tenantId, table.status),
    index('campaigns_tenant_type_idx').on(table.tenantId, table.type),
  ]
);

export const callerIds = pgTable(
  'caller_ids',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    isVerified: boolean('is_verified').default(false).notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('caller_ids_tenant_idx').on(table.tenantId),
    uniqueIndex('caller_ids_tenant_phone_idx').on(table.tenantId, table.phoneNumber),
  ]
);

export const dialingRules = pgTable(
  'dialing_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    ruleType: varchar('rule_type', { length: 50 }).notNull(), // timezone, attempt_limit, recycle, etc.
    conditions: jsonb('conditions').notNull(),
    actions: jsonb('actions').notNull(),
    priority: integer('priority').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('dialing_rules_tenant_idx').on(table.tenantId),
    index('dialing_rules_campaign_idx').on(table.campaignId),
  ]
);

export const dncLists = pgTable(
  'dnc_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
    source: varchar('source', { length: 50 }).default('manual').notNull(), // manual, api, import, customer_request
    reason: text('reason'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('dnc_lists_tenant_phone_idx').on(table.tenantId, table.phoneNumber),
    index('dnc_lists_expires_idx').on(table.expiresAt),
  ]
);

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type CallerId = typeof callerIds.$inferSelect;
export type NewCallerId = typeof callerIds.$inferInsert;
export type DialingRule = typeof dialingRules.$inferSelect;
export type NewDialingRule = typeof dialingRules.$inferInsert;
export type DncEntry = typeof dncLists.$inferSelect;
export type NewDncEntry = typeof dncLists.$inferInsert;
