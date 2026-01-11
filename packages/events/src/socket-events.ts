// Socket.io event definitions for real-time client communication

import type { AgentState } from './agent-events';
import type { CallDirection } from './call-events';

// ============================================
// Server to Client Events
// ============================================

export interface AgentStateChangePayload {
  agentId: string;
  userId: string;
  previousState: AgentState;
  newState: AgentState;
  reason?: string;
  timestamp: string;
}

export interface AgentLoginPayload {
  agentId: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface AgentLogoutPayload {
  agentId: string;
  userId: string;
  timestamp: string;
}

export interface CallStartedPayload {
  callId: string;
  agentId: string;
  leadId?: string;
  direction: CallDirection;
  phoneNumber: string;
  queueId?: string;
  campaignId?: string;
  timestamp: string;
}

export interface CallAnsweredPayload {
  callId: string;
  agentId: string;
  timestamp: string;
}

export interface CallEndedPayload {
  callId: string;
  agentId: string;
  duration: number;
  dispositionId?: string;
  timestamp: string;
}

export interface QueueStatsPayload {
  queueId: string;
  queueName: string;
  callsWaiting: number;
  agentsAvailable: number;
  agentsBusy: number;
  averageWaitTime: number;
  longestWaitTime: number;
  serviceLevelPercent: number;
  timestamp: string;
}

export interface DashboardStatsPayload {
  tenantId: string;
  totalAgents: number;
  agentsByState: Record<string, number>;
  activeCalls: number;
  callsToday: number;
  averageHandleTime: number;
  serviceLevelPercent: number;
  timestamp: string;
}

export interface NotificationPayload {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  userId?: string;
  tenantId?: string;
  timestamp: string;
}

// ============================================
// Socket.io Type Definitions
// ============================================

export interface ServerToClientEvents {
  // Agent events
  'agent:state-changed': (payload: AgentStateChangePayload) => void;
  'agent:login': (payload: AgentLoginPayload) => void;
  'agent:logout': (payload: AgentLogoutPayload) => void;

  // Call events
  'call:started': (payload: CallStartedPayload) => void;
  'call:answered': (payload: CallAnsweredPayload) => void;
  'call:ended': (payload: CallEndedPayload) => void;
  'call:ringing': (payload: { callId: string; phoneNumber: string }) => void;
  'call:held': (payload: { callId: string; isOnHold: boolean }) => void;

  // Queue events
  'queue:stats-updated': (payload: QueueStatsPayload) => void;
  'queue:call-waiting': (payload: { queueId: string; callId: string; position: number }) => void;

  // Dashboard events
  'dashboard:stats-updated': (payload: DashboardStatsPayload) => void;

  // Notifications
  'notification': (payload: NotificationPayload) => void;

  // Connection events
  'connected': (payload: { userId: string; agentId?: string }) => void;
  'error': (payload: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  // Room management
  'join:tenant': (tenantId: string, callback: (success: boolean) => void) => void;
  'leave:tenant': (tenantId: string) => void;
  'join:queue': (queueId: string, callback: (success: boolean) => void) => void;
  'leave:queue': (queueId: string) => void;
  'join:campaign': (campaignId: string, callback: (success: boolean) => void) => void;
  'leave:campaign': (campaignId: string) => void;

  // Agent actions
  'agent:change-state': (
    data: { state: AgentState; reason?: string },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;

  // Call actions
  'call:dial': (
    data: { phoneNumber: string; leadId?: string; campaignId?: string },
    callback: (result: { success: boolean; callId?: string; error?: string }) => void
  ) => void;
  'call:answer': (
    data: { callId: string },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;
  'call:hangup': (
    data: { callId: string },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;
  'call:hold': (
    data: { callId: string },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;
  'call:unhold': (
    data: { callId: string },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;
  'call:mute': (
    data: { callId: string; muted: boolean },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;
  'call:transfer': (
    data: { callId: string; target: string; type: 'blind' | 'warm' },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;

  // Subscription requests
  'subscribe:dashboard': (callback: (result: { success: boolean }) => void) => void;
  'unsubscribe:dashboard': () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  tenantId: string;
  role: string;
  agentId?: string;
  authenticatedAt: string;
}
