'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { QueueWidget } from '../components/queue-widget';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Phone,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueues } from '@/hooks/use-api';

export default function QueuesPage() {
  // Fetch queues from API
  const { data: queuesData, isLoading, error } = useQueues();
  const queues = queuesData?.items || [];

  // Transform queues data for the component
  const transformedQueues = queues.map((queue: any) => ({
    id: queue.id,
    name: queue.name,
    callsWaiting: queue.stats?.callsWaiting || 0,
    longestWait: queue.stats?.longestWait || '00:00',
    agentsAvailable: queue.stats?.agentsAvailable || 0,
    agentsBusy: queue.stats?.agentsBusy || 0,
    agentsTotal: queue.stats?.agentsTotal || 0,
    serviceLevel: queue.stats?.serviceLevel || 0,
    serviceLevelTarget: queue.serviceLevelTarget || 80,
    avgHandleTime: queue.stats?.avgHandleTime || '0:00',
    trend: 'stable' as const,
    priority: queue.priority || 'medium',
    routingStrategy: queue.strategy || 'Round Robin',
    maxWaitTime: queue.maxWaitTime?.toString() || '5:00',
    callsHandledToday: queue.stats?.callsHandledToday || 0,
    callsAbandonedToday: queue.stats?.callsAbandonedToday || 0,
    abandonRate: queue.stats?.abandonRate || '0%',
  }));

  const totalCallsWaiting = transformedQueues.reduce((sum: number, q: any) => sum + q.callsWaiting, 0);
  const totalCallsHandled = transformedQueues.reduce((sum: number, q: any) => sum + q.callsHandledToday, 0);
  const totalCallsAbandoned = transformedQueues.reduce((sum: number, q: any) => sum + q.callsAbandonedToday, 0);
  const avgServiceLevel = transformedQueues.length > 0
    ? Math.round(transformedQueues.reduce((sum: number, q: any) => sum + q.serviceLevel, 0) / transformedQueues.length)
    : 0;

  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Queue Monitoring</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load queues. Please refresh the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Queue Monitoring</h1>
        <p className="text-muted-foreground">
          Real-time queue performance and statistics
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queues</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transformedQueues.length}</div>
            <p className="text-xs text-muted-foreground">
              {totalCallsWaiting} calls waiting
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Handled</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{totalCallsHandled}</div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abandoned</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{totalCallsAbandoned}</div>
            <p className="text-xs text-muted-foreground">
              {((totalCallsAbandoned / totalCallsHandled) * 100).toFixed(1)}% rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Service Level</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                avgServiceLevel >= 80 ? 'text-green-500' : 'text-red-500'
              )}
            >
              {avgServiceLevel}%
            </div>
            <p className="text-xs text-muted-foreground">Across all queues</p>
          </CardContent>
        </Card>
      </div>

      {/* Queue Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Queue Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {transformedQueues.map((queue: any) => (
            <QueueWidget key={queue.id} queue={queue} />
          ))}
        </div>
      </div>

      {/* Detailed Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Details</CardTitle>
          <CardDescription>
            Comprehensive queue metrics and configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Queue</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Routing</TableHead>
                <TableHead>Waiting</TableHead>
                <TableHead>Longest Wait</TableHead>
                <TableHead>Service Level</TableHead>
                <TableHead>Handled</TableHead>
                <TableHead>Abandoned</TableHead>
                <TableHead>Abandon Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transformedQueues.map((queue: any) => {
                const serviceLevelPercentage =
                  (queue.serviceLevel / queue.serviceLevelTarget) * 100;
                const isServiceLevelGood = serviceLevelPercentage >= 90;

                return (
                  <TableRow key={queue.id}>
                    <TableCell className="font-medium">{queue.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          queue.priority === 'urgent'
                            ? 'destructive'
                            : queue.priority === 'high'
                            ? 'warning'
                            : 'secondary'
                        }
                        className="capitalize"
                      >
                        {queue.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {queue.routingStrategy}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span
                          className={cn(
                            'font-semibold',
                            queue.callsWaiting > 5 && 'text-red-500'
                          )}
                        >
                          {queue.callsWaiting}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'font-mono text-sm',
                          queue.longestWait > queue.maxWaitTime && 'text-red-500 font-semibold'
                        )}
                      >
                        {queue.longestWait}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'font-semibold',
                              isServiceLevelGood ? 'text-green-500' : 'text-red-500'
                            )}
                          >
                            {queue.serviceLevel}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            / {queue.serviceLevelTarget}%
                          </span>
                        </div>
                        <Progress
                          value={serviceLevelPercentage}
                          className="h-1"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {queue.callsHandledToday}
                    </TableCell>
                    <TableCell className="font-semibold text-red-500">
                      {queue.callsAbandonedToday}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          parseFloat(queue.abandonRate) < 5 ? 'success' : 'destructive'
                        }
                      >
                        {queue.abandonRate}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Queue Configuration Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Routing Strategies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from(new Set(transformedQueues.map((q: any) => q.routingStrategy))).map(
                (strategy: any) => {
                  const queueCount = transformedQueues.filter(
                    (q: any) => q.routingStrategy === strategy
                  ).length;
                  return (
                    <div
                      key={strategy}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <span className="font-medium">{strategy}</span>
                      <Badge variant="outline">{queueCount} queues</Badge>
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Queue Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transformedQueues
                .filter((q: any) => q.serviceLevel < q.serviceLevelTarget || q.callsWaiting > 5)
                .map((queue: any) => (
                  <div
                    key={queue.id}
                    className="flex items-start gap-3 p-3 border border-yellow-500/50 bg-yellow-500/10 rounded-lg"
                  >
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{queue.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {queue.serviceLevel < queue.serviceLevelTarget
                          ? `Service level below target (${queue.serviceLevel}% / ${queue.serviceLevelTarget}%)`
                          : `High call volume (${queue.callsWaiting} waiting)`}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
