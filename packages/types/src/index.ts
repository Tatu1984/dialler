// ===========================================
// NexusDialer Shared Types
// ===========================================

// ============ Common Types ============
export type UUID = string;
export type ISODateTime = string;

export interface Timestamps {
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============ Tenant Types ============
export interface Tenant extends Timestamps {
  id: UUID;
  name: string;
  slug: string;
  settings: TenantSettings;
  subscriptionTier: 'starter' | 'professional' | 'enterprise';
  maxAgents: number;
  status: 'active' | 'suspended' | 'cancelled';
}

export interface TenantSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  defaultLanguage: string;
  features: {
    aiEnabled: boolean;
    omnichannelEnabled: boolean;
    recordingEnabled: boolean;
  };
}

// ============ User Types ============
export type UserRole = 'admin' | 'supervisor' | 'agent' | 'readonly';

export interface User extends Timestamps {
  id: UUID;
  tenantId: UUID;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'suspended';
  settings: UserSettings;
  lastLoginAt?: ISODateTime;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sound: boolean;
  };
}

export interface AgentProfile extends Timestamps {
  id: UUID;
  userId: UUID;
  tenantId: UUID;
  agentNumber: string;
  extension?: string;
  skills: AgentSkill[];
  maxConcurrentChats: number;
  webrtcEnabled: boolean;
}

export interface AgentSkill {
  skillId: UUID;
  level: number; // 1-10
}

export interface Skill extends Timestamps {
  id: UUID;
  tenantId: UUID;
  name: string;
  description?: string;
}

// ============ Team Types ============
export interface Team extends Timestamps {
  id: UUID;
  tenantId: UUID;
  name: string;
  managerId?: UUID;
  settings: Record<string, unknown>;
}

// ============ Campaign Types ============
export type CampaignType = 'inbound' | 'outbound' | 'blended';
export type DialMode = 'predictive' | 'progressive' | 'preview' | 'power' | 'manual';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export interface Campaign extends Timestamps {
  id: UUID;
  tenantId: UUID;
  name: string;
  type: CampaignType;
  dialMode?: DialMode;
  status: CampaignStatus;
  settings: CampaignSettings;
  schedule: CampaignSchedule;
  callerIdId?: UUID;
}

export interface CampaignSettings {
  dialRatio: number;
  ringTimeout: number;
  maxAttempts: number;
  retryInterval: number;
  amdEnabled: boolean;
  amdAction: 'hangup' | 'leave_message' | 'transfer';
  wrapUpTime: number;
  priorityWeight: number;
}

export interface CampaignSchedule {
  enabled: boolean;
  timezone: string;
  hours: {
    [day: string]: { start: string; end: string } | null;
  };
}

// ============ Lead Types ============
export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'callback'
  | 'interested'
  | 'not_interested'
  | 'dnc'
  | 'invalid'
  | 'converted';

export interface Lead extends Timestamps {
  id: UUID;
  tenantId: UUID;
  listId: UUID;
  phoneNumber: string;
  altPhone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  customFields: Record<string, unknown>;
  status: LeadStatus;
  priority: number;
  leadScore?: number;
  bestTimeToCall?: BestTimeToCall;
  timezone?: string;
  lastAttemptAt?: ISODateTime;
  nextAttemptAt?: ISODateTime;
  attemptCount: number;
}

export interface BestTimeToCall {
  preferredHours: { start: number; end: number };
  preferredDays: number[];
  confidence: number;
}

export interface LeadList extends Timestamps {
  id: UUID;
  tenantId: UUID;
  campaignId?: UUID;
  name: string;
  status: 'active' | 'inactive';
  totalLeads: number;
}

// ============ Call Types ============
export type CallDirection = 'inbound' | 'outbound';
export type CallStatus =
  | 'initiated'
  | 'ringing'
  | 'answered'
  | 'on_hold'
  | 'transferred'
  | 'completed'
  | 'abandoned'
  | 'failed'
  | 'voicemail';

export interface Call extends Timestamps {
  id: UUID;
  tenantId: UUID;
  campaignId?: UUID;
  leadId?: UUID;
  agentId?: UUID;
  queueId?: UUID;
  direction: CallDirection;
  status: CallStatus;
  dispositionId?: UUID;
  phoneNumber: string;
  callerId?: string;
  startTime: ISODateTime;
  answerTime?: ISODateTime;
  endTime?: ISODateTime;
  ringDuration?: number;
  talkDuration?: number;
  holdDuration?: number;
  wrapDuration?: number;
  recordingUrl?: string;
  transcriptUrl?: string;
  aiSummary?: string;
  sentimentScore?: number;
  metadata: Record<string, unknown>;
}

export interface CallDisposition extends Timestamps {
  id: UUID;
  tenantId: UUID;
  campaignId?: UUID;
  code: string;
  name: string;
  description?: string;
  isPositive: boolean;
  requiresCallback: boolean;
  nextAction?: 'callback' | 'dnc' | 'recycle' | 'none';
}

// ============ Queue Types ============
export type QueueStrategy =
  | 'round_robin'
  | 'longest_idle'
  | 'least_calls'
  | 'skills_based'
  | 'ring_all';

export interface Queue extends Timestamps {
  id: UUID;
  tenantId: UUID;
  name: string;
  strategy: QueueStrategy;
  ringTimeout: number;
  maxWaitTime: number;
  overflowQueueId?: UUID;
  settings: QueueSettings;
}

export interface QueueSettings {
  musicOnHold?: string;
  announcePosition: boolean;
  announceWaitTime: boolean;
  announceInterval: number;
  wrapUpTime: number;
  serviceLevelTarget: number; // seconds
  serviceLevelThreshold: number; // percentage
}

// ============ Agent State Types ============
export type AgentState =
  | 'offline'
  | 'available'
  | 'on_call'
  | 'wrap_up'
  | 'break'
  | 'meeting'
  | 'training'
  | 'other';

export interface AgentStateRecord {
  id: UUID;
  tenantId: UUID;
  agentId: UUID;
  state: AgentState;
  reason?: string;
  startedAt: ISODateTime;
  endedAt?: ISODateTime;
  duration?: number;
  callId?: UUID;
}

export interface AgentPresence {
  agentId: UUID;
  tenantId: UUID;
  state: AgentState;
  reason?: string;
  currentCallId?: UUID;
  currentQueueId?: UUID;
  availableSince?: ISODateTime;
  lastStateChange: ISODateTime;
}

// ============ IVR Types ============
export type IVRNodeType =
  | 'start'
  | 'menu'
  | 'play'
  | 'collect'
  | 'transfer'
  | 'voicemail'
  | 'hangup'
  | 'condition'
  | 'api_call'
  | 'ai_bot';

export interface IVRFlow extends Timestamps {
  id: UUID;
  tenantId: UUID;
  name: string;
  description?: string;
  nodes: IVRNode[];
  status: 'draft' | 'published';
}

export interface IVRNode {
  id: string;
  type: IVRNodeType;
  name: string;
  config: Record<string, unknown>;
  next?: string | Record<string, string>;
  position: { x: number; y: number };
}

// ============ Recording Types ============
export interface Recording extends Timestamps {
  id: UUID;
  tenantId: UUID;
  callId: UUID;
  url: string;
  duration: number;
  fileSize: number;
  format: 'mp3' | 'wav' | 'ogg';
  status: 'processing' | 'ready' | 'transcribing' | 'completed' | 'failed';
  retentionUntil?: ISODateTime;
}

// ============ Transcription Types ============
export interface Transcription extends Timestamps {
  id: UUID;
  tenantId: UUID;
  callId: UUID;
  content: string;
  speakers: TranscriptSpeaker[];
  keywords: string[];
  sentiment: TranscriptSentiment;
  language: string;
  confidence: number;
}

export interface TranscriptSpeaker {
  id: string;
  role: 'agent' | 'customer';
  segments: TranscriptSegment[];
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface TranscriptSentiment {
  overall: 'positive' | 'neutral' | 'negative';
  score: number;
  segments: { time: number; score: number }[];
}

// ============ AI Types ============
export interface AgentAssistSuggestion {
  id: string;
  type: 'response' | 'knowledge' | 'action' | 'alert';
  content: string;
  confidence: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeArticle extends Timestamps {
  id: UUID;
  tenantId: UUID;
  title: string;
  content: string;
  category?: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
}

export interface LeadScorePrediction {
  leadId: UUID;
  score: number;
  factors: { name: string; weight: number; value: number }[];
  predictedOutcome: string;
  confidence: number;
  calculatedAt: ISODateTime;
}

// ============ Report Types ============
export interface RealtimeMetrics {
  tenantId: UUID;
  timestamp: ISODateTime;
  agents: {
    total: number;
    available: number;
    onCall: number;
    wrapUp: number;
    break: number;
    offline: number;
  };
  calls: {
    inProgress: number;
    waiting: number;
    abandoned: number;
    completed: number;
  };
  queues: {
    [queueId: string]: {
      waiting: number;
      avgWaitTime: number;
      serviceLevel: number;
    };
  };
  campaigns: {
    [campaignId: string]: {
      dialing: number;
      connected: number;
      dialRate: number;
    };
  };
}

export interface AgentPerformanceReport {
  agentId: UUID;
  period: { start: ISODateTime; end: ISODateTime };
  metrics: {
    totalCalls: number;
    answeredCalls: number;
    abandonedCalls: number;
    avgTalkTime: number;
    avgHoldTime: number;
    avgWrapTime: number;
    avgHandleTime: number;
    occupancy: number;
    adherence: number;
  };
}

// ============ WebSocket Event Types ============
export type WSEventType =
  | 'agent:state_changed'
  | 'agent:call_assigned'
  | 'call:started'
  | 'call:answered'
  | 'call:ended'
  | 'call:transferred'
  | 'queue:updated'
  | 'campaign:updated'
  | 'ai:suggestion'
  | 'ai:transcription'
  | 'ai:sentiment'
  | 'notification';

export interface WSEvent<T = unknown> {
  type: WSEventType;
  tenantId: UUID;
  timestamp: ISODateTime;
  payload: T;
}

// ============ API Response Types ============
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
