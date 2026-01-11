import { z } from 'zod';

// ============ Base Event Schema ============

const baseEventSchema = z.object({
  eventId: z.string().uuid(),
  tenantId: z.string().uuid(),
  timestamp: z.string().datetime(),
  version: z.string().default('1.0'),
});

// ============ System Metrics Event ============

export const systemMetricsSchema = baseEventSchema.extend({
  type: z.literal('system.metrics'),
  payload: z.object({
    metricType: z.enum(['realtime', 'hourly', 'daily']),
    agents: z.object({
      total: z.number(),
      available: z.number(),
      onCall: z.number(),
      wrapUp: z.number(),
      break: z.number(),
      offline: z.number(),
    }),
    calls: z.object({
      inProgress: z.number(),
      waiting: z.number(),
      completedLast15Min: z.number(),
      abandonedLast15Min: z.number(),
    }),
    queues: z.record(
      z.object({
        name: z.string(),
        waiting: z.number(),
        avgWaitTime: z.number(),
        serviceLevel: z.number(),
        abandonRate: z.number(),
      })
    ),
    campaigns: z.record(
      z.object({
        name: z.string(),
        status: z.string(),
        dialing: z.number(),
        connected: z.number(),
        dialRate: z.number(),
        connectRate: z.number(),
      })
    ),
    system: z
      .object({
        cpuUsage: z.number(),
        memoryUsage: z.number(),
        activeConnections: z.number(),
      })
      .optional(),
  }),
});

export type SystemMetricsEvent = z.infer<typeof systemMetricsSchema>;

// ============ System Alert Event ============

export const systemAlertSchema = baseEventSchema.extend({
  type: z.literal('system.alerts'),
  payload: z.object({
    alertId: z.string().uuid(),
    severity: z.enum(['info', 'warning', 'critical']),
    category: z.enum([
      'performance',
      'capacity',
      'quality',
      'compliance',
      'security',
      'integration',
    ]),
    title: z.string(),
    message: z.string(),
    source: z.string(), // service name
    resourceId: z.string().optional(), // affected resource
    resourceType: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    resolvedAt: z.string().datetime().optional(),
  }),
});

export type SystemAlertEvent = z.infer<typeof systemAlertSchema>;

// ============ System Audit Event ============

export const systemAuditSchema = baseEventSchema.extend({
  type: z.literal('system.audit'),
  payload: z.object({
    actorId: z.string().uuid(),
    actorType: z.enum(['user', 'system', 'api']),
    actorEmail: z.string().optional(),
    action: z.string(), // e.g., 'user.create', 'campaign.update', 'settings.change'
    resourceType: z.string(),
    resourceId: z.string(),
    changes: z
      .array(
        z.object({
          field: z.string(),
          oldValue: z.unknown(),
          newValue: z.unknown(),
        })
      )
      .optional(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    result: z.enum(['success', 'failure', 'denied']),
    failureReason: z.string().optional(),
  }),
});

export type SystemAuditEvent = z.infer<typeof systemAuditSchema>;

// ============ System Notification Event ============

export const systemNotificationSchema = baseEventSchema.extend({
  type: z.literal('system.notifications'),
  payload: z.object({
    notificationId: z.string().uuid(),
    recipientId: z.string().uuid(),
    recipientType: z.enum(['user', 'team', 'tenant']),
    channel: z.enum(['in_app', 'email', 'push', 'sms']),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    title: z.string(),
    body: z.string(),
    actionUrl: z.string().optional(),
    actionLabel: z.string().optional(),
    expiresAt: z.string().datetime().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type SystemNotificationEvent = z.infer<typeof systemNotificationSchema>;

// ============ Union Type ============

export type SystemEvent =
  | SystemMetricsEvent
  | SystemAlertEvent
  | SystemAuditEvent
  | SystemNotificationEvent;
