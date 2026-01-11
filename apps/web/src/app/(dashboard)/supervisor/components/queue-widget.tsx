'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Users, Phone, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QueueWidgetProps {
  queue: {
    id: string;
    name: string;
    callsWaiting: number;
    longestWait: string;
    agentsAvailable: number;
    agentsBusy: number;
    agentsTotal: number;
    serviceLevel: number;
    serviceLevelTarget: number;
    avgHandleTime: string;
    trend: 'up' | 'down' | 'stable';
  };
  onClick?: () => void;
}

export function QueueWidget({ queue, onClick }: QueueWidgetProps) {
  const serviceLevelPercentage = (queue.serviceLevel / queue.serviceLevelTarget) * 100;

  const getServiceLevelColor = () => {
    if (serviceLevelPercentage >= 90) return 'text-green-500';
    if (serviceLevelPercentage >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getServiceLevelBgColor = () => {
    if (serviceLevelPercentage >= 90) return 'bg-green-500';
    if (serviceLevelPercentage >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const TrendIcon = queue.trend === 'up' ? TrendingUp : queue.trend === 'down' ? TrendingDown : Minus;
  const trendColor = queue.trend === 'up' ? 'text-red-500' : queue.trend === 'down' ? 'text-green-500' : 'text-gray-500';

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer border-l-4"
      style={{ borderLeftColor: serviceLevelPercentage >= 90 ? 'rgb(34, 197, 94)' : serviceLevelPercentage >= 70 ? 'rgb(234, 179, 8)' : 'rgb(239, 68, 68)' }}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{queue.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                Queue {queue.id}
              </Badge>
            </div>
          </div>
          <TrendIcon className={cn('h-5 w-5', trendColor)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calls Waiting - Prominent */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <Phone className={cn('h-6 w-6', queue.callsWaiting > 5 ? 'text-red-500' : 'text-muted-foreground')} />
            <div className={cn(
              'text-5xl font-bold',
              queue.callsWaiting > 5 ? 'text-red-500 animate-pulse' : 'text-foreground'
            )}>
              {queue.callsWaiting}
            </div>
          </div>
          <div className="text-sm text-muted-foreground mt-1">Calls Waiting</div>
          {queue.longestWait && (
            <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Longest: {queue.longestWait}</span>
            </div>
          )}
        </div>

        {/* Agent Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Agents</span>
            </div>
            <span className="font-semibold">
              {queue.agentsAvailable + queue.agentsBusy} / {queue.agentsTotal}
            </span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <div className="text-xs text-muted-foreground">Available</div>
              <div className="text-xl font-bold text-green-500">{queue.agentsAvailable}</div>
            </div>
            <div className="flex-1 space-y-1">
              <div className="text-xs text-muted-foreground">Busy</div>
              <div className="text-xl font-bold text-blue-500">{queue.agentsBusy}</div>
            </div>
            <div className="flex-1 space-y-1">
              <div className="text-xs text-muted-foreground">Offline</div>
              <div className="text-xl font-bold text-gray-500">
                {queue.agentsTotal - queue.agentsAvailable - queue.agentsBusy}
              </div>
            </div>
          </div>
        </div>

        {/* Service Level */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Service Level</span>
            <span className={cn('text-lg font-bold', getServiceLevelColor())}>
              {queue.serviceLevel}%
            </span>
          </div>
          <Progress
            value={serviceLevelPercentage}
            className="h-2"
          />
          <div className="text-xs text-muted-foreground text-right">
            Target: {queue.serviceLevelTarget}%
          </div>
        </div>

        {/* Average Handle Time */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">Avg Handle Time</span>
          <span className="font-semibold">{queue.avgHandleTime}</span>
        </div>
      </CardContent>
    </Card>
  );
}
