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
import { users } from './users';
import { campaigns } from './campaigns';
import { leads } from './leads';

export const queues = pgTable(
  'queues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    strategy: varchar('strategy', { length: 50 }).default('longest_idle').notNull(),
    ringTimeout: integer('ring_timeout').default(30).notNull(),
    maxWaitTime: integer('max_wait_time').default(600).notNull(),
    overflowQueueId: uuid('overflow_queue_id'),
    settings: jsonb('settings')
      .default({
        musicOnHold: null,
        announcePosition: true,
        announceWaitTime: true,
        announceInterval: 60,
        wrapUpTime: 30,
        serviceLevelTarget: 20,
        serviceLevelThreshold: 80,
      })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('queues_tenant_idx').on(table.tenantId)]
);

export const dispositions = pgTable(
  'dispositions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 20 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    isPositive: integer('is_positive').default(0).notNull(), // 0 = false, 1 = true
    requiresCallback: integer('requires_callback').default(0).notNull(),
    nextAction: varchar('next_action', { length: 20 }).default('none').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('dispositions_tenant_idx').on(table.tenantId),
    index('dispositions_campaign_idx').on(table.campaignId),
  ]
);

export const calls = pgTable(
  'calls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    agentId: uuid('agent_id').references(() => users.id, { onDelete: 'set null' }),
    queueId: uuid('queue_id').references(() => queues.id, { onDelete: 'set null' }),
    direction: varchar('direction', { length: 10 }).notNull(), // inbound, outbound
    status: varchar('status', { length: 50 }).notNull(),
    dispositionId: uuid('disposition_id').references(() => dispositions.id, {
      onDelete: 'set null',
    }),
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
    callerId: varchar('caller_id', { length: 20 }),
    sipCallId: varchar('sip_call_id', { length: 255 }),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    answerTime: timestamp('answer_time', { withTimezone: true }),
    endTime: timestamp('end_time', { withTimezone: true }),
    ringDuration: integer('ring_duration'), // seconds
    talkDuration: integer('talk_duration'), // seconds
    holdDuration: integer('hold_duration'), // seconds
    wrapDuration: integer('wrap_duration'), // seconds
    recordingUrl: text('recording_url'),
    transcriptUrl: text('transcript_url'),
    aiSummary: text('ai_summary'),
    sentimentScore: decimal('sentiment_score', { precision: 3, scale: 2 }),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('calls_tenant_idx').on(table.tenantId),
    index('calls_tenant_start_idx').on(table.tenantId, table.startTime),
    index('calls_agent_idx').on(table.agentId, table.startTime),
    index('calls_campaign_idx').on(table.campaignId, table.startTime),
    index('calls_lead_idx').on(table.leadId),
    index('calls_queue_idx').on(table.queueId, table.startTime),
    index('calls_sip_id_idx').on(table.sipCallId),
  ]
);

export const agentStates = pgTable(
  'agent_states',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    state: varchar('state', { length: 50 }).notNull(),
    reason: varchar('reason', { length: 100 }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    duration: integer('duration'),
    callId: uuid('call_id').references(() => calls.id, { onDelete: 'set null' }),
  },
  (table) => [
    index('agent_states_agent_idx').on(table.agentId, table.startedAt),
    index('agent_states_tenant_idx').on(table.tenantId, table.startedAt),
  ]
);

export const callbackSchedules = pgTable(
  'callback_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    callId: uuid('call_id').references(() => calls.id, { onDelete: 'set null' }),
    agentId: uuid('agent_id').references(() => users.id, { onDelete: 'set null' }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    callbackType: varchar('callback_type', { length: 20 }).default('any').notNull(), // any, agent_specific
    notes: text('notes'),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('callback_schedules_tenant_idx').on(table.tenantId),
    index('callback_schedules_scheduled_idx').on(table.tenantId, table.status, table.scheduledAt),
    index('callback_schedules_agent_idx').on(table.agentId, table.status, table.scheduledAt),
  ]
);

export type Queue = typeof queues.$inferSelect;
export type NewQueue = typeof queues.$inferInsert;
export type Disposition = typeof dispositions.$inferSelect;
export type NewDisposition = typeof dispositions.$inferInsert;
export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
export type AgentState = typeof agentStates.$inferSelect;
export type NewAgentState = typeof agentStates.$inferInsert;
export type CallbackSchedule = typeof callbackSchedules.$inferSelect;
export type NewCallbackSchedule = typeof callbackSchedules.$inferInsert;
