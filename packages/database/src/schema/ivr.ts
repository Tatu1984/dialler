import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const ivrFlows = pgTable(
  'ivr_flows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    nodes: jsonb('nodes').default([]).notNull(),
    status: varchar('status', { length: 20 }).default('draft').notNull(), // draft, published
    version: varchar('version', { length: 20 }).default('1.0').notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ivr_flows_tenant_idx').on(table.tenantId),
    index('ivr_flows_status_idx').on(table.tenantId, table.status),
  ]
);

export const audioFiles = pgTable(
  'audio_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(), // prompt, hold_music, voicemail_greeting
    fileUrl: text('file_url').notNull(),
    fileSize: varchar('file_size', { length: 20 }),
    duration: varchar('duration', { length: 20 }),
    format: varchar('format', { length: 10 }).notNull(), // mp3, wav
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audio_files_tenant_idx').on(table.tenantId),
    index('audio_files_type_idx').on(table.tenantId, table.type),
  ]
);

export const scripts = pgTable(
  'scripts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    content: jsonb('content').default({}).notNull(), // Script content with branching logic
    status: varchar('status', { length: 20 }).default('draft').notNull(),
    version: varchar('version', { length: 20 }).default('1.0').notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('scripts_tenant_idx').on(table.tenantId),
    index('scripts_status_idx').on(table.tenantId, table.status),
  ]
);

export type IvrFlow = typeof ivrFlows.$inferSelect;
export type NewIvrFlow = typeof ivrFlows.$inferInsert;
export type AudioFile = typeof audioFiles.$inferSelect;
export type NewAudioFile = typeof audioFiles.$inferInsert;
export type Script = typeof scripts.$inferSelect;
export type NewScript = typeof scripts.$inferInsert;
