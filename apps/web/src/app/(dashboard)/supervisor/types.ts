/**
 * Supervisor Dashboard Types
 * Shared TypeScript types and interfaces for the supervisor dashboard
 */

// Agent Status Types
export type AgentStatus =
  | 'available'
  | 'on-call'
  | 'wrap-up'
  | 'break'
  | 'offline'
  | 'away';

// Call Status Types
export type CallStatus = 'talking' | 'hold' | 'wrap-up' | 'ringing';

// Call Direction Types
export type CallDirection = 'inbound' | 'outbound';

// Queue Priority Types
export type QueuePriority = 'urgent' | 'high' | 'medium' | 'low';

// Queue Trend Types
export type QueueTrend = 'up' | 'down' | 'stable';

// Routing Strategy Types
export type RoutingStrategy =
  | 'Longest Idle Time'
  | 'Round Robin'
  | 'Skills Based'
  | 'Most Available'
  | 'Least Occupied';

/**
 * Agent Interface
 */
export interface Agent {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  status: AgentStatus;
  team?: string;
  skill?: string;
  extension?: string;
  currentCall?: CurrentCall;
  stats: AgentStats;
  performance?: AgentPerformance;
}

/**
 * Current Call Information
 */
export interface CurrentCall {
  id?: string;
  phoneNumber: string;
  duration: string;
  queue: string;
  customerName?: string;
  direction?: CallDirection;
}

/**
 * Agent Statistics
 */
export interface AgentStats {
  callsToday: number;
  talkTime: string;
  avgHandleTime: string;
  wrapUpTime?: string;
  breakTime?: string;
}

/**
 * Agent Performance Metrics
 */
export interface AgentPerformance {
  conversionRate?: string;
  satisfaction: number;
  adherence: string;
  qualityScore?: number;
  firstCallResolution?: string;
}

/**
 * Queue Interface
 */
export interface Queue {
  id: string;
  name: string;
  description?: string;
  callsWaiting: number;
  longestWait: string;
  agentsAvailable: number;
  agentsBusy: number;
  agentsTotal: number;
  serviceLevel: number;
  serviceLevelTarget: number;
  avgHandleTime: string;
  avgWaitTime?: string;
  trend: QueueTrend;
  priority?: QueuePriority;
  routingStrategy?: RoutingStrategy;
  maxWaitTime?: string;
  callsHandledToday?: number;
  callsAbandonedToday?: number;
  abandonRate?: string;
}

/**
 * Live Call Interface
 */
export interface LiveCall {
  id: string;
  agentId?: string;
  agentName: string;
  customerNumber: string;
  customerName?: string;
  duration: string;
  queue: string;
  status: CallStatus;
  direction: CallDirection;
  startTime?: Date;
  holdTime?: string;
  recordingId?: string;
}

/**
 * Supervisor Action Callbacks
 */
export interface SupervisorActions {
  onListen?: (id: string) => void;
  onWhisper?: (id: string) => void;
  onBarge?: (id: string) => void;
  onDisconnect?: (id: string) => void;
  onForceBreak?: (id: string) => void;
  onForceLogout?: (id: string) => void;
  onSendMessage?: (id: string, message: string) => void;
}

/**
 * Dashboard Metrics Interface
 */
export interface DashboardMetrics {
  totalAgents: number;
  availableAgents: number;
  onCallAgents: number;
  onBreakAgents: number;
  offlineAgents?: number;
  callsWaiting: number;
  longestWait: string;
  callsHandledToday: number;
  callsAbandonedToday: number;
  serviceLevel: number;
  avgWaitTime: string;
  avgHandleTime: string;
  avgSpeedOfAnswer: string;
  abandonRate?: number;
}

/**
 * Filter Options
 */
export interface FilterOptions {
  status?: AgentStatus | 'all';
  team?: string | 'all';
  skill?: string | 'all';
  searchQuery?: string;
}

/**
 * View Mode Types
 */
export type ViewMode = 'grid' | 'table';

/**
 * Alert Interface
 */
export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  queueId?: string;
  agentId?: string;
  acknowledged?: boolean;
}

/**
 * Broadcast Message Interface
 */
export interface BroadcastMessage {
  id: string;
  message: string;
  targetType: 'all' | 'team' | 'queue' | 'agent';
  targetIds?: string[];
  timestamp: Date;
  senderId: string;
  senderName: string;
}

/**
 * Real-time Event Types
 */
export type RealtimeEventType =
  | 'agent_status_changed'
  | 'call_started'
  | 'call_ended'
  | 'call_waiting'
  | 'queue_updated'
  | 'service_level_alert'
  | 'agent_break_extended';

/**
 * Real-time Event Interface
 */
export interface RealtimeEvent {
  type: RealtimeEventType;
  timestamp: Date;
  data: any;
}

/**
 * Status Configuration
 */
export interface StatusConfig {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'info';
  color: string;
}

/**
 * Color Threshold Configuration
 */
export interface ThresholdConfig {
  excellent: number; // >= this value is green
  good: number; // >= this value is yellow
  // < good value is red
}

/**
 * Wallboard Configuration
 */
export interface WallboardConfig {
  refreshInterval: number; // in milliseconds
  fullscreen: boolean;
  showAlerts: boolean;
  showQueueBreakdown: boolean;
  thresholds: {
    serviceLevel: ThresholdConfig;
    waitTime: ThresholdConfig;
    abandonRate: ThresholdConfig;
  };
}
