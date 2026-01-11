'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

export type AgentStatus =
  | 'available'
  | 'break'
  | 'lunch'
  | 'training'
  | 'meeting'
  | 'offline';

interface AgentStatusSelectorProps {
  currentStatus: AgentStatus;
  onStatusChange: (status: AgentStatus, reason?: string) => void;
}

const statusConfig = {
  available: {
    label: 'Available',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    requiresReason: false,
  },
  break: {
    label: 'Break',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    requiresReason: true,
  },
  lunch: {
    label: 'Lunch',
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    requiresReason: false,
  },
  training: {
    label: 'Training',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    requiresReason: false,
  },
  meeting: {
    label: 'Meeting',
    color: 'bg-purple-500',
    textColor: 'text-purple-700',
    requiresReason: false,
  },
  offline: {
    label: 'Offline',
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    requiresReason: false,
  },
};

export function AgentStatusSelector({
  currentStatus,
  onStatusChange,
}: AgentStatusSelectorProps) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(0);

  // Timer for status duration
  useEffect(() => {
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStatus]);

  // Reset duration when status changes
  useEffect(() => {
    setDuration(0);
  }, [currentStatus]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const handleStatusChange = (newStatus: AgentStatus) => {
    if (statusConfig[newStatus].requiresReason && !reason) {
      return;
    }
    onStatusChange(newStatus, reason);
    setReason('');
  };

  const config = statusConfig[currentStatus];

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div
          className={`h-3 w-3 rounded-full ${config.color} ${
            currentStatus === 'available' ? 'animate-pulse' : ''
          }`}
        />
        <Select value={currentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue>
              <span className={`font-medium ${config.textColor}`}>
                {config.label}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="available">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Available
              </div>
            </SelectItem>
            <SelectItem value="break">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                Break
              </div>
            </SelectItem>
            <SelectItem value="lunch">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                Lunch
              </div>
            </SelectItem>
            <SelectItem value="training">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                Training
              </div>
            </SelectItem>
            <SelectItem value="meeting">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                Meeting
              </div>
            </SelectItem>
            <SelectItem value="offline">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-500" />
                Offline
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{formatDuration(duration)}</span>
      </div>

      {statusConfig[currentStatus].requiresReason && (
        <div className="flex-1 max-w-xs">
          <Input
            placeholder="Reason for break..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-9"
          />
        </div>
      )}
    </div>
  );
}
