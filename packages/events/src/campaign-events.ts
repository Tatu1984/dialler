import { z } from 'zod';

// ============ Base Event Schema ============

const baseEventSchema = z.object({
  eventId: z.string().uuid(),
  tenantId: z.string().uuid(),
  timestamp: z.string().datetime(),
  version: z.string().default('1.0'),
});

// ============ Campaign Started Event ============

export const campaignStartedSchema = baseEventSchema.extend({
  type: z.literal('campaigns.started'),
  payload: z.object({
    campaignId: z.string().uuid(),
    campaignName: z.string(),
    campaignType: z.enum(['inbound', 'outbound', 'blended']),
    dialMode: z.enum(['predictive', 'progressive', 'preview', 'power', 'manual']).optional(),
    startTime: z.string().datetime(),
    startedBy: z.string().uuid(),
    settings: z.record(z.unknown()).optional(),
    totalLeads: z.number().optional(),
  }),
});

export type CampaignStartedEvent = z.infer<typeof campaignStartedSchema>;

// ============ Campaign Paused Event ============

export const campaignPausedSchema = baseEventSchema.extend({
  type: z.literal('campaigns.paused'),
  payload: z.object({
    campaignId: z.string().uuid(),
    campaignName: z.string(),
    pauseTime: z.string().datetime(),
    pausedBy: z.string().uuid(),
    reason: z.string().optional(),
    stats: z
      .object({
        callsDialed: z.number(),
        callsConnected: z.number(),
        callsAbandoned: z.number(),
        leadsRemaining: z.number(),
      })
      .optional(),
  }),
});

export type CampaignPausedEvent = z.infer<typeof campaignPausedSchema>;

// ============ Campaign Completed Event ============

export const campaignCompletedSchema = baseEventSchema.extend({
  type: z.literal('campaigns.completed'),
  payload: z.object({
    campaignId: z.string().uuid(),
    campaignName: z.string(),
    completionTime: z.string().datetime(),
    completionReason: z.enum(['exhausted', 'manual', 'scheduled', 'error']),
    stats: z.object({
      totalLeads: z.number(),
      callsDialed: z.number(),
      callsConnected: z.number(),
      callsAbandoned: z.number(),
      conversions: z.number(),
      avgTalkTime: z.number(),
      duration: z.number(), // total campaign duration in seconds
    }),
  }),
});

export type CampaignCompletedEvent = z.infer<typeof campaignCompletedSchema>;

// ============ Campaign Lead Dialed Event ============

export const campaignLeadDialedSchema = baseEventSchema.extend({
  type: z.literal('campaigns.lead-dialed'),
  payload: z.object({
    campaignId: z.string().uuid(),
    leadId: z.string().uuid(),
    listId: z.string().uuid(),
    callId: z.string().uuid(),
    phoneNumber: z.string(),
    attemptNumber: z.number(),
    dialTime: z.string().datetime(),
    agentId: z.string().uuid().optional(),
    leadScore: z.number().optional(),
  }),
});

export type CampaignLeadDialedEvent = z.infer<typeof campaignLeadDialedSchema>;

// ============ Campaign List Exhausted Event ============

export const campaignListExhaustedSchema = baseEventSchema.extend({
  type: z.literal('campaigns.list-exhausted'),
  payload: z.object({
    campaignId: z.string().uuid(),
    campaignName: z.string(),
    listId: z.string().uuid(),
    listName: z.string(),
    exhaustedAt: z.string().datetime(),
    totalDialed: z.number(),
    totalConverted: z.number(),
    remainingInOtherLists: z.number(),
  }),
});

export type CampaignListExhaustedEvent = z.infer<typeof campaignListExhaustedSchema>;

// ============ Union Type ============

export type CampaignEvent =
  | CampaignStartedEvent
  | CampaignPausedEvent
  | CampaignCompletedEvent
  | CampaignLeadDialedEvent
  | CampaignListExhaustedEvent;
