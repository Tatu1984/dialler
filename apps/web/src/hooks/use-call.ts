'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from './use-socket';
import type {
  CallStartedPayload,
  CallAnsweredPayload,
  CallEndedPayload,
} from '@nexusdialer/events';

export type CallState = 'idle' | 'dialing' | 'ringing' | 'connected' | 'held' | 'ended';

export interface ActiveCall {
  callId: string;
  phoneNumber: string;
  leadId?: string;
  campaignId?: string;
  direction: 'inbound' | 'outbound';
  state: CallState;
  startTime: Date;
  answerTime?: Date;
  duration: number;
  muted: boolean;
  onHold: boolean;
}

export function useCall() {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isDialing, setIsDialing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { emit, on, isConnected } = useSocket();

  // Update duration while on call
  useEffect(() => {
    if (!activeCall || activeCall.state !== 'connected') return;

    const interval = setInterval(() => {
      setActiveCall((prev) => {
        if (!prev || !prev.answerTime) return prev;
        return {
          ...prev,
          duration: Math.floor((Date.now() - prev.answerTime.getTime()) / 1000),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCall?.state, activeCall?.answerTime]);

  // Listen for call events
  useEffect(() => {
    const unsubscribeStarted = on('call:started', (payload: CallStartedPayload) => {
      setActiveCall({
        callId: payload.callId,
        phoneNumber: payload.phoneNumber,
        leadId: payload.leadId,
        campaignId: payload.campaignId,
        direction: payload.direction,
        state: 'dialing',
        startTime: new Date(payload.timestamp),
        duration: 0,
        muted: false,
        onHold: false,
      });
      setIsDialing(false);
    });

    const unsubscribeRinging = on('call:ringing', (payload) => {
      setActiveCall((prev) => {
        if (!prev || prev.callId !== payload.callId) return prev;
        return { ...prev, state: 'ringing' };
      });
    });

    const unsubscribeAnswered = on('call:answered', (payload: CallAnsweredPayload) => {
      setActiveCall((prev) => {
        if (!prev || prev.callId !== payload.callId) return prev;
        return {
          ...prev,
          state: 'connected',
          answerTime: new Date(payload.timestamp),
        };
      });
    });

    const unsubscribeHeld = on('call:held', (payload) => {
      setActiveCall((prev) => {
        if (!prev || prev.callId !== payload.callId) return prev;
        return {
          ...prev,
          state: payload.isOnHold ? 'held' : 'connected',
          onHold: payload.isOnHold,
        };
      });
    });

    const unsubscribeEnded = on('call:ended', (payload: CallEndedPayload) => {
      setActiveCall((prev) => {
        if (!prev || prev.callId !== payload.callId) return prev;
        return { ...prev, state: 'ended', duration: payload.duration };
      });

      // Clear call after a delay
      setTimeout(() => {
        setActiveCall(null);
      }, 3000);
    });

    return () => {
      unsubscribeStarted();
      unsubscribeRinging();
      unsubscribeAnswered();
      unsubscribeHeld();
      unsubscribeEnded();
    };
  }, [on]);

  const dial = useCallback(
    async (phoneNumber: string, options?: { leadId?: string; campaignId?: string }) => {
      if (!isConnected) {
        setError('Not connected to server');
        return false;
      }

      if (activeCall && activeCall.state !== 'ended') {
        setError('Already on a call');
        return false;
      }

      setIsDialing(true);
      setError(null);

      return new Promise<boolean>((resolve) => {
        emit('call:dial', {
          phoneNumber,
          leadId: options?.leadId,
          campaignId: options?.campaignId,
        }, (result) => {
          if (!result.success) {
            setIsDialing(false);
            setError(result.error || 'Failed to dial');
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    },
    [emit, isConnected, activeCall]
  );

  const answer = useCallback(async () => {
    if (!activeCall) {
      setError('No active call');
      return false;
    }

    return new Promise<boolean>((resolve) => {
      emit('call:answer', { callId: activeCall.callId }, (result) => {
        if (!result.success) {
          setError(result.error || 'Failed to answer');
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, [emit, activeCall]);

  const hangup = useCallback(async () => {
    if (!activeCall) {
      setError('No active call');
      return false;
    }

    return new Promise<boolean>((resolve) => {
      emit('call:hangup', { callId: activeCall.callId }, (result) => {
        if (!result.success) {
          setError(result.error || 'Failed to hang up');
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, [emit, activeCall]);

  const hold = useCallback(async () => {
    if (!activeCall) {
      setError('No active call');
      return false;
    }

    return new Promise<boolean>((resolve) => {
      emit('call:hold', { callId: activeCall.callId }, (result) => {
        if (!result.success) {
          setError(result.error || 'Failed to hold');
          resolve(false);
        } else {
          setActiveCall((prev) => prev ? { ...prev, onHold: true, state: 'held' } : prev);
          resolve(true);
        }
      });
    });
  }, [emit, activeCall]);

  const unhold = useCallback(async () => {
    if (!activeCall) {
      setError('No active call');
      return false;
    }

    return new Promise<boolean>((resolve) => {
      emit('call:unhold', { callId: activeCall.callId }, (result) => {
        if (!result.success) {
          setError(result.error || 'Failed to unhold');
          resolve(false);
        } else {
          setActiveCall((prev) => prev ? { ...prev, onHold: false, state: 'connected' } : prev);
          resolve(true);
        }
      });
    });
  }, [emit, activeCall]);

  const mute = useCallback(async (muted: boolean) => {
    if (!activeCall) {
      setError('No active call');
      return false;
    }

    return new Promise<boolean>((resolve) => {
      emit('call:mute', { callId: activeCall.callId, muted }, (result) => {
        if (!result.success) {
          setError(result.error || 'Failed to mute/unmute');
          resolve(false);
        } else {
          setActiveCall((prev) => prev ? { ...prev, muted } : prev);
          resolve(true);
        }
      });
    });
  }, [emit, activeCall]);

  const transfer = useCallback(async (target: string, type: 'blind' | 'warm') => {
    if (!activeCall) {
      setError('No active call');
      return false;
    }

    return new Promise<boolean>((resolve) => {
      emit('call:transfer', { callId: activeCall.callId, target, type }, (result) => {
        if (!result.success) {
          setError(result.error || 'Failed to transfer');
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, [emit, activeCall]);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    activeCall,
    isDialing,
    isOnCall: activeCall !== null && activeCall.state !== 'ended',
    error,
    dial,
    answer,
    hangup,
    hold,
    unhold,
    mute,
    transfer,
    formatDuration,
    clearError: () => setError(null),
  };
}
