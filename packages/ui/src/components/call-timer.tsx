'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

interface CallTimerProps extends React.HTMLAttributes<HTMLDivElement> {
  startTime: Date | number;
  isRunning?: boolean;
  format?: 'hh:mm:ss' | 'mm:ss';
}

function formatDuration(seconds: number, format: 'hh:mm:ss' | 'mm:ss'): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (format === 'hh:mm:ss') {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function CallTimer({
  startTime,
  isRunning = true,
  format = 'mm:ss',
  className,
  ...props
}: CallTimerProps) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (!isRunning) return;

    const start = typeof startTime === 'number' ? startTime : startTime.getTime();

    const updateElapsed = () => {
      const now = Date.now();
      setElapsed(Math.floor((now - start) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime, isRunning]);

  return (
    <div
      className={cn(
        'font-mono text-sm tabular-nums',
        !isRunning && 'opacity-60',
        className
      )}
      {...props}
    >
      {formatDuration(elapsed, format)}
    </div>
  );
}
