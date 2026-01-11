import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  decimal,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { calls } from './calls';

export const transcriptions = pgTable(
  'transcriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    callId: uuid('call_id')
      .notNull()
      .references(() => calls.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    speakers: jsonb('speakers').default([]).notNull(),
    keywords: jsonb('keywords').default([]).notNull(),
    sentiment: jsonb('sentiment').default({}).notNull(),
    language: varchar('language', { length: 10 }),
    confidence: decimal('confidence', { precision: 3, scale: 2 }),
    processingTime: integer('processing_time'), // milliseconds
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('transcriptions_tenant_idx').on(table.tenantId),
    index('transcriptions_call_idx').on(table.callId),
  ]
);

export const agentAssistEvents = pgTable(
  'agent_assist_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    callId: uuid('call_id')
      .notNull()
      .references(() => calls.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 50 }).notNull(), // suggestion, alert, knowledge_surface
    content: jsonb('content').notNull(),
    shownAt: timestamp('shown_at', { withTimezone: true }).notNull(),
    accepted: integer('accepted'), // null = no action, 0 = rejected, 1 = accepted
    feedback: varchar('feedback', { length: 20 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('agent_assist_events_tenant_idx').on(table.tenantId),
    index('agent_assist_events_call_idx').on(table.callId),
    index('agent_assist_events_agent_idx').on(table.agentId),
  ]
);

export const knowledgeArticles = pgTable(
  'knowledge_articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    category: varchar('category', { length: 100 }),
    tags: jsonb('tags').default([]).notNull(),
    // Note: vector embedding would be stored in a separate vector DB (Qdrant)
    embeddingId: varchar('embedding_id', { length: 100 }),
    status: varchar('status', { length: 20 }).default('published').notNull(),
    viewCount: integer('view_count').default(0).notNull(),
    helpfulCount: integer('helpful_count').default(0).notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('knowledge_articles_tenant_idx').on(table.tenantId),
    index('knowledge_articles_status_idx').on(table.tenantId, table.status),
    index('knowledge_articles_category_idx').on(table.tenantId, table.category),
  ]
);

export const leadScorePredictions = pgTable(
  'lead_score_predictions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id').notNull(),
    score: decimal('score', { precision: 5, scale: 2 }).notNull(),
    factors: jsonb('factors').default([]).notNull(),
    predictedOutcome: varchar('predicted_outcome', { length: 50 }),
    confidence: decimal('confidence', { precision: 3, scale: 2 }),
    modelVersion: varchar('model_version', { length: 50 }),
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('lead_score_predictions_tenant_idx').on(table.tenantId),
    index('lead_score_predictions_lead_idx').on(table.leadId),
  ]
);

export type Transcription = typeof transcriptions.$inferSelect;
export type NewTranscription = typeof transcriptions.$inferInsert;
export type AgentAssistEvent = typeof agentAssistEvents.$inferSelect;
export type NewAgentAssistEvent = typeof agentAssistEvents.$inferInsert;
export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;
export type NewKnowledgeArticle = typeof knowledgeArticles.$inferInsert;
export type LeadScorePrediction = typeof leadScorePredictions.$inferSelect;
export type NewLeadScorePrediction = typeof leadScorePredictions.$inferInsert;
