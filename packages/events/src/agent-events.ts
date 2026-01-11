import { z } from 'zod';

// ============ Base Event Schema ============

const baseEventSchema = z.object({
  eventId: z.string().uuid(),
  tenantId: z.string().uuid(),
  timestamp: z.string().datetime(),
  version: z.string().default('1.0'),
});

// ============ Agent State Types ============

export const agentStateEnum = z.enum([
  'offline',
  'available',
  'on_call',
  'wrap_up',
  'break',
  'meeting',
  'training',
  'other',
]);

export type AgentState = z.infer<typeof agentStateEnum>;

// ============ Agent State Changed Event ============

export const agentStateChangedSchema = baseEventSchema.extend({
  type: z.literal('agents.state-changed'),
  payload: z.object({
    agentId: z.string().uuid(),
    previousState: agentStateEnum,
    newState: agentStateEnum,
    reason: z.string().optional(),
    callId: z.string().uuid().optional(),
    queueId: z.string().uuid().optional(),
    duration: z.number().optional(), // seconds in previous state
  }),
});

export type AgentStateChangedEvent = z.infer<typeof agentStateChangedSchema>;

// ============ Agent Logged In Event ============

export const agentLoggedInSchema = baseEventSchema.extend({
  type: z.literal('agents.logged-in'),
  payload: z.object({
    agentId: z.string().uuid(),
    userId: z.string().uuid(),
    agentNumber: z.string(),
    extension: z.string().optional(),
    loginTime: z.string().datetime(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    queues: z.array(z.string().uuid()).optional(),
    skills: z.array(z.object({ skillId: z.string().uuid(), level: z.number() })).optional(),
  }),
});

export type AgentLoggedInEvent = z.infer<typeof agentLoggedInSchema>;

// ============ Agent Logged Out Event ============

export const agentLoggedOutSchema = baseEventSchema.extend({
  type: z.literal('agents.logged-out'),
  payload: z.object({
    agentId: z.string().uuid(),
    userId: z.string().uuid(),
    logoutTime: z.string().datetime(),
    reason: z.enum(['manual', 'timeout', 'forced', 'system']),
    sessionDuration: z.number(), // seconds
    stats: z
      .object({
        totalCalls: z.number(),
        totalTalkTime: z.number(),
        totalHoldTime: z.number(),
        totalWrapTime: z.number(),
        totalBreakTime: z.number(),
      })
      .optional(),
  }),
});

export type AgentLoggedOutEvent = z.infer<typeof agentLoggedOutSchema>;

// ============ Agent Break Events ============

export const agentBreakStartedSchema = baseEventSchema.extend({
  type: z.literal('agents.break-started'),
  payload: z.object({
    agentId: z.string().uuid(),
    breakType: z.string(), // lunch, short, personal, etc.
    startTime: z.string().datetime(),
    scheduledDuration: z.number().optional(), // seconds
  }),
});

export type AgentBreakStartedEvent = z.infer<typeof agentBreakStartedSchema>;

export const agentBreakEndedSchema = baseEventSchema.extend({
  type: z.literal('agents.break-ended'),
  payload: z.object({
    agentId: z.string().uuid(),
    breakType: z.string(),
    endTime: z.string().datetime(),
    actualDuration: z.number(), // seconds
    scheduledDuration: z.number().optional(), // seconds
    overrun: z.number().optional(), // seconds over scheduled
  }),
});

export type AgentBreakEndedEvent = z.infer<typeof agentBreakEndedSchema>;

// ============ Agent Call Assigned Event ============

export const agentCallAssignedSchema = baseEventSchema.extend({
  type: z.literal('agents.call-assigned'),
  payload: z.object({
    agentId: z.string().uuid(),
    callId: z.string().uuid(),
    assignmentTime: z.string().datetime(),
    assignmentType: z.enum(['inbound', 'outbound', 'callback', 'transfer']),
    queueId: z.string().uuid().optional(),
    campaignId: z.string().uuid().optional(),
    leadId: z.string().uuid().optional(),
    phoneNumber: z.string(),
    customerName: z.string().optional(),
    priority: z.number().default(0),
  }),
});

export type AgentCallAssignedEvent = z.infer<typeof agentCallAssignedSchema>;

// ============ Union Type ============

export type AgentEvent =
  | AgentStateChangedEvent
  | AgentLoggedInEvent
  | AgentLoggedOutEvent
  | AgentBreakStartedEvent
  | AgentBreakEndedEvent
  | AgentCallAssignedEvent;
