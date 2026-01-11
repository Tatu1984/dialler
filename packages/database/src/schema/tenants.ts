import { pgTable, uuid, varchar, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  settings: jsonb('settings')
    .default({
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      defaultLanguage: 'en',
      features: {
        aiEnabled: true,
        omnichannelEnabled: true,
        recordingEnabled: true,
      },
    })
    .notNull(),
  subscriptionTier: varchar('subscription_tier', { length: 50 }).default('starter').notNull(),
  maxAgents: integer('max_agents').default(100).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
