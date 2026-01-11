/**
 * Kafka Topic Definitions
 */

export const TOPICS = {
  // Call lifecycle events
  CALLS_STARTED: 'calls.started',
  CALLS_ANSWERED: 'calls.answered',
  CALLS_ENDED: 'calls.ended',
  CALLS_TRANSFERRED: 'calls.transferred',
  CALLS_RECORDED: 'calls.recorded',
  CALLS_ON_HOLD: 'calls.on-hold',

  // Agent events
  AGENTS_STATE_CHANGED: 'agents.state-changed',
  AGENTS_LOGGED_IN: 'agents.logged-in',
  AGENTS_LOGGED_OUT: 'agents.logged-out',
  AGENTS_BREAK_STARTED: 'agents.break-started',
  AGENTS_BREAK_ENDED: 'agents.break-ended',
  AGENTS_CALL_ASSIGNED: 'agents.call-assigned',

  // Queue events
  QUEUES_CALL_ENQUEUED: 'queues.call-enqueued',
  QUEUES_CALL_DEQUEUED: 'queues.call-dequeued',
  QUEUES_THRESHOLD_BREACHED: 'queues.threshold-breached',
  QUEUES_SLA_WARNING: 'queues.sla-warning',

  // Campaign events
  CAMPAIGNS_STARTED: 'campaigns.started',
  CAMPAIGNS_PAUSED: 'campaigns.paused',
  CAMPAIGNS_COMPLETED: 'campaigns.completed',
  CAMPAIGNS_LEAD_DIALED: 'campaigns.lead-dialed',
  CAMPAIGNS_LIST_EXHAUSTED: 'campaigns.list-exhausted',

  // AI events
  AI_TRANSCRIPTION_STARTED: 'ai.transcription-started',
  AI_TRANSCRIPTION_READY: 'ai.transcription-ready',
  AI_SENTIMENT_ANALYZED: 'ai.sentiment-analyzed',
  AI_SUGGESTION_GENERATED: 'ai.suggestion-generated',
  AI_SUMMARY_READY: 'ai.summary-ready',
  AI_LEAD_SCORED: 'ai.lead-scored',

  // System events
  SYSTEM_METRICS: 'system.metrics',
  SYSTEM_ALERTS: 'system.alerts',
  SYSTEM_AUDIT: 'system.audit',
  SYSTEM_NOTIFICATIONS: 'system.notifications',
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

/**
 * Topic configuration for Kafka
 */
export const TOPIC_CONFIG: Record<
  TopicName,
  {
    partitions: number;
    replicationFactor: number;
    retentionMs: number;
  }
> = {
  // Call events - high throughput, short retention
  [TOPICS.CALLS_STARTED]: { partitions: 12, replicationFactor: 2, retentionMs: 86400000 },
  [TOPICS.CALLS_ANSWERED]: { partitions: 12, replicationFactor: 2, retentionMs: 86400000 },
  [TOPICS.CALLS_ENDED]: { partitions: 12, replicationFactor: 2, retentionMs: 86400000 },
  [TOPICS.CALLS_TRANSFERRED]: { partitions: 6, replicationFactor: 2, retentionMs: 86400000 },
  [TOPICS.CALLS_RECORDED]: { partitions: 6, replicationFactor: 2, retentionMs: 604800000 },
  [TOPICS.CALLS_ON_HOLD]: { partitions: 6, replicationFactor: 2, retentionMs: 86400000 },

  // Agent events - medium throughput
  [TOPICS.AGENTS_STATE_CHANGED]: { partitions: 6, replicationFactor: 2, retentionMs: 86400000 },
  [TOPICS.AGENTS_LOGGED_IN]: { partitions: 3, replicationFactor: 2, retentionMs: 604800000 },
  [TOPICS.AGENTS_LOGGED_OUT]: { partitions: 3, replicationFactor: 2, retentionMs: 604800000 },
  [TOPICS.AGENTS_BREAK_STARTED]: { partitions: 3, replicationFactor: 2, retentionMs: 86400000 },
  [TOPICS.AGENTS_BREAK_ENDED]: { partitions: 3, replicationFactor: 2, retentionMs: 86400000 },
  [TOPICS.AGENTS_CALL_ASSIGNED]: { partitions: 6, replicationFactor: 2, retentionMs: 86400000 },

  // Queue events
  [TOPICS.QUEUES_CALL_ENQUEUED]: { partitions: 6, replicationFactor: 2, retentionMs: 86400000 },
  [TOPICS.QUEUES_CALL_DEQUEUED]: { partitions: 6, replicationFactor: 2, retentionMs: 86400000 },
  [TOPICS.QUEUES_THRESHOLD_BREACHED]: {
    partitions: 3,
    replicationFactor: 2,
    retentionMs: 604800000,
  },
  [TOPICS.QUEUES_SLA_WARNING]: { partitions: 3, replicationFactor: 2, retentionMs: 604800000 },

  // Campaign events
  [TOPICS.CAMPAIGNS_STARTED]: { partitions: 3, replicationFactor: 2, retentionMs: 604800000 },
  [TOPICS.CAMPAIGNS_PAUSED]: { partitions: 3, replicationFactor: 2, retentionMs: 604800000 },
  [TOPICS.CAMPAIGNS_COMPLETED]: { partitions: 3, replicationFactor: 2, retentionMs: 604800000 },
  [TOPICS.CAMPAIGNS_LEAD_DIALED]: { partitions: 12, replicationFactor: 2, retentionMs: 86400000 },
  [TOPICS.CAMPAIGNS_LIST_EXHAUSTED]: {
    partitions: 3,
    replicationFactor: 2,
    retentionMs: 604800000,
  },

  // AI events
  [TOPICS.AI_TRANSCRIPTION_STARTED]: {
    partitions: 6,
    replicationFactor: 2,
    retentionMs: 86400000,
  },
  [TOPICS.AI_TRANSCRIPTION_READY]: { partitions: 6, replicationFactor: 2, retentionMs: 604800000 },
  [TOPICS.AI_SENTIMENT_ANALYZED]: { partitions: 6, replicationFactor: 2, retentionMs: 604800000 },
  [TOPICS.AI_SUGGESTION_GENERATED]: { partitions: 6, replicationFactor: 2, retentionMs: 86400000 },
  [TOPICS.AI_SUMMARY_READY]: { partitions: 6, replicationFactor: 2, retentionMs: 604800000 },
  [TOPICS.AI_LEAD_SCORED]: { partitions: 6, replicationFactor: 2, retentionMs: 604800000 },

  // System events
  [TOPICS.SYSTEM_METRICS]: { partitions: 6, replicationFactor: 2, retentionMs: 86400000 },
  [TOPICS.SYSTEM_ALERTS]: { partitions: 3, replicationFactor: 2, retentionMs: 2592000000 },
  [TOPICS.SYSTEM_AUDIT]: { partitions: 6, replicationFactor: 2, retentionMs: 7776000000 },
  [TOPICS.SYSTEM_NOTIFICATIONS]: { partitions: 6, replicationFactor: 2, retentionMs: 604800000 },
};
