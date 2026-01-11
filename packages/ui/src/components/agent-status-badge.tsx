import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      status: {
        available: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        busy: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        away: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        offline: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
        ringing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse',
        'on-call': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        'wrap-up': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        break: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
        lunch: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        training: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      },
    },
    defaultVariants: {
      status: 'offline',
    },
  }
);

const statusDotVariants = cva('h-2 w-2 rounded-full', {
  variants: {
    status: {
      available: 'bg-green-500',
      busy: 'bg-red-500',
      away: 'bg-yellow-500',
      offline: 'bg-gray-500',
      ringing: 'bg-blue-500 animate-ping',
      'on-call': 'bg-purple-500',
      'wrap-up': 'bg-orange-500',
      break: 'bg-cyan-500',
      lunch: 'bg-amber-500',
      training: 'bg-indigo-500',
    },
  },
  defaultVariants: {
    status: 'offline',
  },
});

export type AgentStatus =
  | 'available'
  | 'busy'
  | 'away'
  | 'offline'
  | 'ringing'
  | 'on-call'
  | 'wrap-up'
  | 'break'
  | 'lunch'
  | 'training';

interface AgentStatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  status: AgentStatus;
  showDot?: boolean;
  label?: string;
}

const statusLabels: Record<AgentStatus, string> = {
  available: 'Available',
  busy: 'Busy',
  away: 'Away',
  offline: 'Offline',
  ringing: 'Ringing',
  'on-call': 'On Call',
  'wrap-up': 'Wrap-up',
  break: 'Break',
  lunch: 'Lunch',
  training: 'Training',
};

export function AgentStatusBadge({
  status,
  showDot = true,
  label,
  className,
  ...props
}: AgentStatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {showDot && <span className={statusDotVariants({ status })} />}
      {label || statusLabels[status]}
    </span>
  );
}
