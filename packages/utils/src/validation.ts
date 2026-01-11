import { z } from 'zod';

// ============ Common Schemas ============

export const emailSchema = z.string().email('Invalid email address');

export const phoneSchema = z
  .string()
  .min(10, 'Phone number too short')
  .max(15, 'Phone number too long')
  .regex(/^[\d\s\-+()]+$/, 'Invalid phone number format');

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// ============ User Schemas ============

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.enum(['admin', 'supervisor', 'agent', 'readonly']),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

// ============ Campaign Schemas ============

export const campaignSettingsSchema = z.object({
  dialRatio: z.number().min(1).max(10).default(1.5),
  ringTimeout: z.number().min(10).max(120).default(30),
  maxAttempts: z.number().min(1).max(20).default(5),
  retryInterval: z.number().min(60).max(86400).default(3600),
  amdEnabled: z.boolean().default(true),
  amdAction: z.enum(['hangup', 'leave_message', 'transfer']).default('hangup'),
  wrapUpTime: z.number().min(0).max(600).default(30),
  priorityWeight: z.number().min(1).max(100).default(50),
});

export const campaignScheduleSchema = z.object({
  enabled: z.boolean().default(true),
  timezone: z.string().default('America/New_York'),
  hours: z.record(
    z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
    z
      .object({
        start: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
        end: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
      })
      .nullable()
  ),
});

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(255),
  type: z.enum(['inbound', 'outbound', 'blended']),
  dialMode: z.enum(['predictive', 'progressive', 'preview', 'power', 'manual']).optional(),
  settings: campaignSettingsSchema.optional(),
  schedule: campaignScheduleSchema.optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

// ============ Lead Schemas ============

export const createLeadSchema = z.object({
  phoneNumber: phoneSchema,
  altPhone: phoneSchema.optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: emailSchema.optional(),
  company: z.string().max(255).optional(),
  customFields: z.record(z.unknown()).optional(),
  timezone: z.string().optional(),
  priority: z.number().min(0).max(100).default(0),
});

export const updateLeadSchema = createLeadSchema.partial();

export const leadImportSchema = z.array(createLeadSchema).min(1).max(10000);

// ============ Queue Schemas ============

export const queueSettingsSchema = z.object({
  musicOnHold: z.string().optional(),
  announcePosition: z.boolean().default(true),
  announceWaitTime: z.boolean().default(true),
  announceInterval: z.number().min(10).max(300).default(60),
  wrapUpTime: z.number().min(0).max(600).default(30),
  serviceLevelTarget: z.number().min(1).max(300).default(20),
  serviceLevelThreshold: z.number().min(1).max(100).default(80),
});

export const createQueueSchema = z.object({
  name: z.string().min(1, 'Queue name is required').max(100),
  strategy: z
    .enum(['round_robin', 'longest_idle', 'least_calls', 'skills_based', 'ring_all'])
    .default('longest_idle'),
  ringTimeout: z.number().min(5).max(120).default(30),
  maxWaitTime: z.number().min(60).max(3600).default(600),
  overflowQueueId: uuidSchema.optional(),
  settings: queueSettingsSchema.optional(),
});

export const updateQueueSchema = createQueueSchema.partial();

// ============ Disposition Schemas ============

export const createDispositionSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPositive: z.boolean().default(false),
  requiresCallback: z.boolean().default(false),
  nextAction: z.enum(['callback', 'dnc', 'recycle', 'none']).default('none'),
});

// ============ Pagination Schema ============

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============ Type Exports ============

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type CreateQueueInput = z.infer<typeof createQueueSchema>;
export type UpdateQueueInput = z.infer<typeof updateQueueSchema>;
export type CreateDispositionInput = z.infer<typeof createDispositionSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
