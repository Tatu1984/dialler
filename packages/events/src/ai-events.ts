import { z } from 'zod';

// ============ Base Event Schema ============

const baseEventSchema = z.object({
  eventId: z.string().uuid(),
  tenantId: z.string().uuid(),
  timestamp: z.string().datetime(),
  version: z.string().default('1.0'),
});

// ============ Transcription Started Event ============

export const aiTranscriptionStartedSchema = baseEventSchema.extend({
  type: z.literal('ai.transcription-started'),
  payload: z.object({
    callId: z.string().uuid(),
    transcriptionId: z.string().uuid(),
    startTime: z.string().datetime(),
    mode: z.enum(['real-time', 'post-call']),
    language: z.string().optional(),
  }),
});

export type AITranscriptionStartedEvent = z.infer<typeof aiTranscriptionStartedSchema>;

// ============ Transcription Ready Event ============

export const aiTranscriptionReadySchema = baseEventSchema.extend({
  type: z.literal('ai.transcription-ready'),
  payload: z.object({
    callId: z.string().uuid(),
    transcriptionId: z.string().uuid(),
    content: z.string(),
    speakers: z.array(
      z.object({
        id: z.string(),
        role: z.enum(['agent', 'customer']),
        segments: z.array(
          z.object({
            start: z.number(),
            end: z.number(),
            text: z.string(),
            confidence: z.number(),
          })
        ),
      })
    ),
    keywords: z.array(z.string()),
    language: z.string(),
    confidence: z.number(),
    processingTime: z.number(), // milliseconds
  }),
});

export type AITranscriptionReadyEvent = z.infer<typeof aiTranscriptionReadySchema>;

// ============ Sentiment Analyzed Event ============

export const aiSentimentAnalyzedSchema = baseEventSchema.extend({
  type: z.literal('ai.sentiment-analyzed'),
  payload: z.object({
    callId: z.string().uuid(),
    overall: z.enum(['positive', 'neutral', 'negative']),
    score: z.number().min(-1).max(1),
    segments: z.array(
      z.object({
        time: z.number(), // seconds from call start
        score: z.number().min(-1).max(1),
        label: z.enum(['positive', 'neutral', 'negative']),
      })
    ),
    emotions: z
      .array(
        z.object({
          emotion: z.string(),
          confidence: z.number(),
        })
      )
      .optional(),
    alerts: z.array(z.string()).optional(), // escalation triggers, compliance concerns
  }),
});

export type AISentimentAnalyzedEvent = z.infer<typeof aiSentimentAnalyzedSchema>;

// ============ Suggestion Generated Event ============

export const aiSuggestionGeneratedSchema = baseEventSchema.extend({
  type: z.literal('ai.suggestion-generated'),
  payload: z.object({
    callId: z.string().uuid(),
    agentId: z.string().uuid(),
    suggestionId: z.string().uuid(),
    type: z.enum(['response', 'knowledge', 'action', 'alert', 'compliance']),
    content: z.string(),
    confidence: z.number(),
    source: z.string().optional(), // knowledge article ID, etc.
    context: z
      .object({
        trigger: z.string(), // what triggered this suggestion
        relevantText: z.string().optional(),
      })
      .optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
  }),
});

export type AISuggestionGeneratedEvent = z.infer<typeof aiSuggestionGeneratedSchema>;

// ============ Summary Ready Event ============

export const aiSummaryReadySchema = baseEventSchema.extend({
  type: z.literal('ai.summary-ready'),
  payload: z.object({
    callId: z.string().uuid(),
    summary: z.string(),
    keyPoints: z.array(z.string()),
    actionItems: z.array(
      z.object({
        description: z.string(),
        assignee: z.enum(['agent', 'customer', 'system']).optional(),
        dueDate: z.string().datetime().optional(),
      })
    ),
    topics: z.array(z.string()),
    outcome: z.string().optional(),
    nextSteps: z.string().optional(),
    processingTime: z.number(), // milliseconds
  }),
});

export type AISummaryReadyEvent = z.infer<typeof aiSummaryReadySchema>;

// ============ Lead Scored Event ============

export const aiLeadScoredSchema = baseEventSchema.extend({
  type: z.literal('ai.lead-scored'),
  payload: z.object({
    leadId: z.string().uuid(),
    campaignId: z.string().uuid().optional(),
    score: z.number().min(0).max(100),
    previousScore: z.number().optional(),
    factors: z.array(
      z.object({
        name: z.string(),
        weight: z.number(),
        value: z.number(),
        impact: z.enum(['positive', 'negative', 'neutral']),
      })
    ),
    predictedOutcome: z.string(),
    confidence: z.number(),
    recommendedAction: z.string().optional(),
    bestTimeToCall: z
      .object({
        preferredHours: z.object({ start: z.number(), end: z.number() }),
        preferredDays: z.array(z.number()),
        confidence: z.number(),
      })
      .optional(),
    modelVersion: z.string(),
  }),
});

export type AILeadScoredEvent = z.infer<typeof aiLeadScoredSchema>;

// ============ Union Type ============

export type AIEvent =
  | AITranscriptionStartedEvent
  | AITranscriptionReadyEvent
  | AISentimentAnalyzedEvent
  | AISuggestionGeneratedEvent
  | AISummaryReadyEvent
  | AILeadScoredEvent;
