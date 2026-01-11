'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  AgentStateChangePayload,
  QueueStatsPayload,
  DashboardStatsPayload,
  NotificationPayload,
} from '@nexusdialer/events';
import { useAuthStore } from '@/stores/auth-store';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface UseSocketOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true, onConnect, onDisconnect, onError } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<TypedSocket | null>(null);
  const { user, token, isAuthenticated } = useAuthStore();

  // Initialize socket connection
  useEffect(() => {
    if (!autoConnect || !isAuthenticated || !token) {
      return;
    }

    const socket: TypedSocket = io(SOCKET_URL, {
      auth: {
        token,
        userId: user?.id,
        tenantId: user?.tenant?.id,
        role: user?.role,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      onDisconnect?.(reason);
    });

    socket.on('connect_error', (error) => {
      setConnectionError(error.message);
      onError?.(error);
    });

    socket.on('error', (payload) => {
      setConnectionError(payload.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [autoConnect, isAuthenticated, token, user, onConnect, onDisconnect, onError]);

  // Emit helper
  const emit = useCallback(<E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, ...args);
    }
  }, []);

  // Subscribe to events
  const on = useCallback(<E extends keyof ServerToClientEvents>(
    event: E,
    callback: ServerToClientEvents[E]
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socketRef.current?.on(event, callback as any);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socketRef.current?.off(event, callback as any);
    };
  }, []);

  // Room management
  const joinQueue = useCallback((queueId: string) => {
    return new Promise<boolean>((resolve) => {
      emit('join:queue', queueId, resolve);
    });
  }, [emit]);

  const leaveQueue = useCallback((queueId: string) => {
    emit('leave:queue', queueId);
  }, [emit]);

  const joinCampaign = useCallback((campaignId: string) => {
    return new Promise<boolean>((resolve) => {
      emit('join:campaign', campaignId, resolve);
    });
  }, [emit]);

  const leaveCampaign = useCallback((campaignId: string) => {
    emit('leave:campaign', campaignId);
  }, [emit]);

  const subscribeToDashboard = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      emit('subscribe:dashboard', (result) => resolve(result.success));
    });
  }, [emit]);

  const unsubscribeFromDashboard = useCallback(() => {
    emit('unsubscribe:dashboard');
  }, [emit]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    emit,
    on,
    joinQueue,
    leaveQueue,
    joinCampaign,
    leaveCampaign,
    subscribeToDashboard,
    unsubscribeFromDashboard,
  };
}

// Hook for agent state
export function useAgentState() {
  const [agentStates, setAgentStates] = useState<Map<string, AgentStateChangePayload>>(new Map());
  const { on } = useSocket();

  useEffect(() => {
    const unsubscribe = on('agent:state-changed', (payload) => {
      setAgentStates((prev) => {
        const next = new Map(prev);
        next.set(payload.agentId, payload);
        return next;
      });
    });

    return unsubscribe;
  }, [on]);

  return { agentStates: Array.from(agentStates.values()) };
}

// Hook for queue stats
export function useQueueStats(queueId?: string) {
  const [stats, setStats] = useState<QueueStatsPayload | null>(null);
  const { on, joinQueue, leaveQueue, isConnected } = useSocket();

  useEffect(() => {
    if (!queueId || !isConnected) return;

    joinQueue(queueId);

    const unsubscribe = on('queue:stats-updated', (payload) => {
      if (payload.queueId === queueId) {
        setStats(payload);
      }
    });

    return () => {
      unsubscribe();
      leaveQueue(queueId);
    };
  }, [queueId, isConnected, on, joinQueue, leaveQueue]);

  return { stats };
}

// Hook for dashboard stats
export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStatsPayload | null>(null);
  const { on, subscribeToDashboard, unsubscribeFromDashboard, isConnected } = useSocket();

  useEffect(() => {
    if (!isConnected) return;

    subscribeToDashboard();

    const unsubscribe = on('dashboard:stats-updated', (payload) => {
      setStats(payload);
    });

    return () => {
      unsubscribe();
      unsubscribeFromDashboard();
    };
  }, [isConnected, on, subscribeToDashboard, unsubscribeFromDashboard]);

  return { stats };
}

// Hook for notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const { on } = useSocket();

  useEffect(() => {
    const unsubscribe = on('notification', (payload) => {
      setNotifications((prev) => [payload, ...prev].slice(0, 50)); // Keep last 50
    });

    return unsubscribe;
  }, [on]);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return { notifications, clearNotification, clearAll };
}
