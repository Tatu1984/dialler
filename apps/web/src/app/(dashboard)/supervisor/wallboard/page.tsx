'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Phone,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  PhoneIncoming,
  PhoneOff,
  Timer,
  Target,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock real-time data
const useRealtimeMetrics = () => {
  const [metrics, setMetrics] = useState({
    totalAgents: 42,
    availableAgents: 12,
    onCallAgents: 28,
    onBreakAgents: 2,
    callsWaiting: 15,
    longestWait: '04:32',
    callsHandledToday: 847,
    callsAbandonedToday: 23,
    serviceLevel: 87,
    avgWaitTime: '02:15',
    avgHandleTime: '05:45',
    avgSpeedOfAnswer: '00:42',
  });

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        callsWaiting: Math.max(0, prev.callsWaiting + Math.floor(Math.random() * 5) - 2),
        onCallAgents: Math.min(prev.totalAgents, Math.max(0, prev.onCallAgents + Math.floor(Math.random() * 3) - 1)),
        availableAgents: Math.max(0, prev.totalAgents - prev.onCallAgents - prev.onBreakAgents),
        callsHandledToday: prev.callsHandledToday + Math.floor(Math.random() * 2),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return metrics;
};

export default function WallboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [fullscreen, setFullscreen] = useState(false);
  const metrics = useRealtimeMetrics();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const serviceLevelColor =
    metrics.serviceLevel >= 90
      ? 'text-green-500'
      : metrics.serviceLevel >= 70
      ? 'text-yellow-500'
      : 'text-red-500';

  const serviceLevelBg =
    metrics.serviceLevel >= 90
      ? 'bg-green-500'
      : metrics.serviceLevel >= 70
      ? 'bg-yellow-500'
      : 'bg-red-500';

  const abandonRate = ((metrics.callsAbandonedToday / metrics.callsHandledToday) * 100).toFixed(1);

  return (
    <div className={cn('space-y-6 p-6', fullscreen && 'h-screen bg-background')}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Center Wallboard</h1>
          <p className="text-muted-foreground">Live performance metrics</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Current Time</div>
            <div className="text-2xl font-bold font-mono">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFullscreen(!fullscreen)}
          >
            <Settings className="mr-2 h-4 w-4" />
            {fullscreen ? 'Exit' : 'Fullscreen'}
          </Button>
        </div>
      </div>

      {/* Primary Metrics - Large Display */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Calls Waiting */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Calls Waiting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div
                className={cn(
                  'text-7xl font-bold tabular-nums',
                  metrics.callsWaiting > 10 ? 'text-red-500 animate-pulse' : 'text-foreground'
                )}
              >
                {metrics.callsWaiting}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Longest: {metrics.longestWait}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Level */}
        <Card className={cn('border-l-4', `border-l-${serviceLevelBg.split('-')[1]}-500`)}>
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground flex items-center gap-2">
              <Target className="h-5 w-5" />
              Service Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={cn('text-7xl font-bold tabular-nums', serviceLevelColor)}>
                {metrics.serviceLevel}%
              </div>
              <div className="space-y-2">
                <Progress value={metrics.serviceLevel} className="h-3" />
                <p className="text-sm text-muted-foreground">Target: 80%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agents Status */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agent Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-4xl font-bold text-green-500">
                    {metrics.availableAgents}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Available</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-blue-500">
                    {metrics.onCallAgents}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">On Call</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-gray-500">
                    {metrics.onBreakAgents}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Break</div>
                </div>
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold">{metrics.totalAgents}</span>
                <span className="text-sm text-muted-foreground ml-2">Total Agents</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{metrics.avgWaitTime}</div>
            <p className="text-xs text-muted-foreground mt-1">Target: 02:00</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Handle Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{metrics.avgHandleTime}</div>
            <p className="text-xs text-muted-foreground mt-1">All queues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Handled</CardTitle>
            <PhoneIncoming className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {metrics.callsHandledToday}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abandon Rate</CardTitle>
            <PhoneOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-3xl font-bold',
                parseFloat(abandonRate) < 5 ? 'text-green-500' : 'text-red-500'
              )}
            >
              {abandonRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.callsAbandonedToday} abandoned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Queue Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { name: 'Sales', serviceLevel: 78, target: 80, waiting: 8 },
                { name: 'Support', serviceLevel: 92, target: 85, waiting: 3 },
                { name: 'Billing', serviceLevel: 65, target: 80, waiting: 12 },
                { name: 'VIP', serviceLevel: 98, target: 90, waiting: 1 },
              ].map((queue) => {
                const percentage = (queue.serviceLevel / queue.target) * 100;
                const color =
                  percentage >= 90
                    ? 'text-green-500'
                    : percentage >= 70
                    ? 'text-yellow-500'
                    : 'text-red-500';
                const bgColor =
                  percentage >= 90
                    ? 'bg-green-500'
                    : percentage >= 70
                    ? 'bg-yellow-500'
                    : 'bg-red-500';

                return (
                  <div key={queue.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-lg">{queue.name}</span>
                        <Badge variant="outline">{queue.waiting} waiting</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-2xl font-bold tabular-nums', color)}>
                          {queue.serviceLevel}%
                        </span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <PhoneIncoming className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Calls Answered</p>
                    <p className="text-3xl font-bold">{metrics.callsHandledToday}</p>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                    <PhoneOff className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Calls Abandoned</p>
                    <p className="text-3xl font-bold">{metrics.callsAbandonedToday}</p>
                  </div>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Speed to Answer</p>
                    <p className="text-3xl font-bold font-mono">
                      {metrics.avgSpeedOfAnswer}
                    </p>
                  </div>
                </div>
                <Minus className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Update Indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span>Live updates every 3 seconds</span>
      </div>
    </div>
  );
}
