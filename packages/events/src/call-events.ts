import { z } from 'zod';

// ============ Base Event Schema ============

const baseEventSchema = z.object({
  eventId: z.string().uuid(),
  tenantId: z.string().uuid(),
  timestamp: z.string().datetime(),
  version: z.string().default('1.0'),
});

// ============ Common Types ============

export const callDirectionSchema = z.enum(['inbound', 'outbound']);
export type CallDirection = z.infer<typeof callDirectionSchema>;

// ============ Call Started Event ============

export const callStartedSchema = baseEventSchema.extend({
  type: z.literal('calls.started'),
  payload: z.object({
    callId: z.string().uuid(),
    direction: z.enum(['inbound', 'outbound']),
    phoneNumber: z.string(),
    callerId: z.string().optional(),
    campaignId: z.string().uuid().optional(),
    queueId: z.string().uuid().optional(),
    leadId: z.string().uuid().optional(),
    agentId: z.string().uuid().optional(),
    sipCallId: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type CallStartedEvent = z.infer<typeof callStartedSchema>;

// ============ Call Answered Event ============

export const callAnsweredSchema = baseEventSchema.extend({
  type: z.literal('calls.answered'),
  payload: z.object({
    callId: z.string().uuid(),
    agentId: z.string().uuid(),
    answerTime: z.string().datetime(),
    ringDuration: z.number(), // seconds
    queueWaitTime: z.number().optional(), // seconds
  }),
});

export type CallAnsweredEvent = z.infer<typeof callAnsweredSchema>;

// ============ Call Ended Event ============

export const callEndedSchema = baseEventSchema.extend({
  type: z.literal('calls.ended'),
  payload: z.object({
    callId: z.string().uuid(),
    agentId: z.string().uuid().optional(),
    endTime: z.string().datetime(),
    status: z.enum(['completed', 'abandoned', 'failed', 'voicemail', 'no_answer', 'busy']),
    dispositionId: z.string().uuid().optional(),
    dispositionCode: z.string().optional(),
    talkDuration: z.number().optional(), // seconds
    holdDuration: z.number().optional(), // seconds
    wrapDuration: z.number().optional(), // seconds
    totalDuration: z.number(), // seconds
    notes: z.string().optional(),
    recordingUrl: z.string().optional(),
  }),
});

export type CallEndedEvent = z.infer<typeof callEndedSchema>;

// ============ Call Transferred Event ============

export const callTransferredSchema = baseEventSchema.extend({
  type: z.literal('calls.transferred'),
  payload: z.object({
    callId: z.string().uuid(),
    fromAgentId: z.string().uuid(),
    toAgentId: z.string().uuid().optional(),
    toQueueId: z.string().uuid().optional(),
    toExternalNumber: z.string().optional(),
    transferType: z.enum(['warm', 'cold', 'blind']),
    transferTime: z.string().datetime(),
  }),
});

export type CallTransferredEvent = z.infer<typeof callTransferredSchema>;

// ============ Call Recorded Event ============

export const callRecordedSchema = baseEventSchema.extend({
  type: z.literal('calls.recorded'),
  payload: z.object({
    callId: z.string().uuid(),
    recordingId: z.string().uuid(),
    recordingUrl: z.string(),
    duration: z.number(), // seconds
    fileSize: z.number(), // bytes
    format: z.enum(['mp3', 'wav', 'ogg']),
    status: z.enum(['processing', 'ready', 'failed']),
  }),
});

export type CallRecordedEvent = z.infer<typeof callRecordedSchema>;

// ============ Call On Hold Event ============

export const callOnHoldSchema = baseEventSchema.extend({
  type: z.literal('calls.on-hold'),
  payload: z.object({
    callId: z.string().uuid(),
    agentId: z.string().uuid(),
    action: z.enum(['hold', 'resume']),
    holdTime: z.string().datetime(),
    holdDuration: z.number().optional(), // seconds, only on resume
  }),
});

export type CallOnHoldEvent = z.infer<typeof callOnHoldSchema>;

// ============ Queue Events ============

export const queueCallEnqueuedSchema = baseEventSchema.extend({
  type: z.literal('queues.call-enqueued'),
  payload: z.object({
    callId: z.string().uuid(),
    queueId: z.string().uuid(),
    queueName: z.string(),
    position: z.number(),
    estimatedWaitTime: z.number().optional(), // seconds
    priority: z.number().default(0),
  }),
});

export type QueueCallEnqueuedEvent = z.infer<typeof queueCallEnqueuedSchema>;

export const queueCallDequeuedSchema = baseEventSchema.extend({
  type: z.literal('queues.call-dequeued'),
  payload: z.object({
    callId: z.string().uuid(),
    queueId: z.string().uuid(),
    agentId: z.string().uuid().optional(),
    reason: z.enum(['answered', 'abandoned', 'timeout', 'overflow', 'callback']),
    waitTime: z.number(), // seconds
  }),
});

export type QueueCallDequeuedEvent = z.infer<typeof queueCallDequeuedSchema>;

export const queueThresholdBreachedSchema = baseEventSchema.extend({
  type: z.literal('queues.threshold-breached'),
  payload: z.object({
    queueId: z.string().uuid(),
    queueName: z.string(),
    metric: z.enum(['wait_time', 'queue_length', 'abandon_rate', 'service_level']),
    threshold: z.number(),
    currentValue: z.number(),
    severity: z.enum(['warning', 'critical']),
  }),
});

export type QueueThresholdBreachedEvent = z.infer<typeof queueThresholdBreachedSchema>;

// ============ Union Types ============

export type CallEvent =
  | CallStartedEvent
  | CallAnsweredEvent
  | CallEndedEvent
  | CallTransferredEvent
  | CallRecordedEvent
  | CallOnHoldEvent;

export type QueueEvent =
  | QueueCallEnqueuedEvent
  | QueueCallDequeuedEvent
  | QueueThresholdBreachedEvent;
