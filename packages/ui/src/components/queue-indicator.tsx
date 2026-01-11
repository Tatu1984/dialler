import * as React from 'react';
import { cn } from '../lib/utils';

interface QueueIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  callsWaiting: number;
  agentsAvailable: number;
  averageWaitTime?: number;
  serviceLevelPercent?: number;
}

export function QueueIndicator({
  name,
  callsWaiting,
  agentsAvailable,
  averageWaitTime,
  serviceLevelPercent,
  className,
  ...props
}: QueueIndicatorProps) {
  const getQueueStatus = () => {
    if (callsWaiting === 0) return 'normal';
    if (callsWaiting > agentsAvailable * 2) return 'critical';
    if (callsWaiting > agentsAvailable) return 'warning';
    return 'normal';
  };

  const status = getQueueStatus();

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        status === 'critical' && 'border-red-500 bg-red-50 dark:bg-red-950/20',
        status === 'warning' && 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
        status === 'normal' && 'border-border bg-card',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{name}</h4>
        {serviceLevelPercent !== undefined && (
          <span
            className={cn(
              'text-xs font-medium',
              serviceLevelPercent >= 80 && 'text-green-600',
              serviceLevelPercent >= 60 && serviceLevelPercent < 80 && 'text-yellow-600',
              serviceLevelPercent < 60 && 'text-red-600'
            )}
          >
            SL: {serviceLevelPercent}%
          </span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Calls Waiting</p>
          <p className={cn(
            'text-lg font-semibold',
            status === 'critical' && 'text-red-600',
            status === 'warning' && 'text-yellow-600'
          )}>
            {callsWaiting}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Agents Available</p>
          <p className="text-lg font-semibold text-green-600">{agentsAvailable}</p>
        </div>
      </div>
      {averageWaitTime !== undefined && (
        <div className="mt-2 text-xs text-muted-foreground">
          Avg wait: {formatWaitTime(averageWaitTime)}
        </div>
      )}
    </div>
  );
}
