'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChartWidget, PieChart, AreaChart } from '../components/chart-widget';
import { MetricCard } from '../components/metric-card';
import {
  Phone,
  Users,
  Clock,
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  Pause,
  Play,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface QueueStatus {
  name: string;
  waiting: number;
  longestWait: string;
  avgWait: string;
}

interface AgentStatus {
  name: string;
  value: number;
  color: string;
}

export default function RealtimePage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLastUpdate(new Date());
      // In a real app, fetch fresh data here
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Mock real-time data
  const agentStatusData: AgentStatus[] = [
    { name: 'Available', value: 12, color: '#22c55e' },
    { name: 'On Call', value: 28, color: '#3b82f6' },
    { name: 'Wrap Up', value: 8, color: '#f59e0b' },
    { name: 'Break', value: 5, color: '#8b5cf6' },
    { name: 'Offline', value: 5, color: '#6b7280' },
  ];

  const queueData: QueueStatus[] = [
    {
      name: 'Sales Queue',
      waiting: 7,
      longestWait: '3:45',
      avgWait: '1:22',
    },
    {
      name: 'Support Queue',
      waiting: 12,
      longestWait: '5:12',
      avgWait: '2:18',
    },
    {
      name: 'VIP Queue',
      waiting: 2,
      longestWait: '0:45',
      avgWait: '0:32',
    },
    {
      name: 'General Queue',
      waiting: 18,
      longestWait: '7:23',
      avgWait: '3:05',
    },
  ];

  const callsPerHourData = [
    { name: '8 AM', value: 45 },
    { name: '9 AM', value: 78 },
    { name: '10 AM', value: 92 },
    { name: '11 AM', value: 87 },
    { name: '12 PM', value: 65 },
    { name: '1 PM', value: 72 },
    { name: '2 PM', value: 95 },
    { name: '3 PM', value: 88 },
    { name: '4 PM', value: 76 },
  ];

  const totalAgents = agentStatusData.reduce((sum, s) => sum + s.value, 0);
  const availableAgents = agentStatusData.find(
    (s) => s.name === 'Available'
  )?.value || 0;
  const onCallAgents = agentStatusData.find(
    (s) => s.name === 'On Call'
  )?.value || 0;

  // Service level calculation (mock)
  const serviceLevelTarget = 80;
  const currentServiceLevel = 87.3;
  const serviceLevelColor =
    currentServiceLevel >= serviceLevelTarget ? '#22c55e' : '#ef4444';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Real-time Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Live monitoring and current statistics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLastUpdate(new Date())}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Live Calls"
          value={onCallAgents}
          icon={Phone}
          description={`${availableAgents} agents available`}
        />
        <MetricCard
          title="Total Agents"
          value={totalAgents}
          icon={Users}
          description={`${onCallAgents} currently on call`}
        />
        <MetricCard
          title="Avg Wait Time"
          value="2:15"
          icon={Clock}
          description="Across all queues"
        />
        <MetricCard
          title="Service Level"
          value="87.3%"
          icon={TrendingUp}
          description="Target: 80% in 20s"
          change={3.1}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agent Status Distribution */}
        <ChartWidget
          title="Agent Status Distribution"
          description={`${totalAgents} total agents`}
        >
          <PieChart data={agentStatusData} height={280} />
        </ChartWidget>

        {/* Service Level Gauge */}
        <Card>
          <CardHeader>
            <CardTitle>Service Level</CardTitle>
            <p className="text-sm text-muted-foreground">
              Calls answered within 20 seconds
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[280px]">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="10"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={serviceLevelColor}
                    strokeWidth="10"
                    strokeDasharray={`${(currentServiceLevel / 100) * 251.2} 251.2`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-4xl font-bold">
                    {currentServiceLevel}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Target: {serviceLevelTarget}%
                  </div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Badge
                  variant={
                    currentServiceLevel >= serviceLevelTarget
                      ? 'success'
                      : 'destructive'
                  }
                >
                  {currentServiceLevel >= serviceLevelTarget
                    ? 'Meeting Target'
                    : 'Below Target'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Status</CardTitle>
          <p className="text-sm text-muted-foreground">
            Current wait times and queue levels
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {queueData.map((queue, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{queue.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Avg Wait: {queue.avgWait} | Longest: {queue.longestWait}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold">{queue.waiting}</div>
                    <div className="text-xs text-muted-foreground">
                      waiting
                    </div>
                  </div>
                  <Badge
                    variant={
                      queue.waiting > 10
                        ? 'destructive'
                        : queue.waiting > 5
                        ? 'warning'
                        : 'success'
                    }
                  >
                    {queue.waiting > 10
                      ? 'High'
                      : queue.waiting > 5
                      ? 'Medium'
                      : 'Low'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calls Per Hour */}
      <ChartWidget
        title="Calls Per Hour"
        description="Call volume throughout the day"
      >
        <AreaChart data={callsPerHourData} height={250} />
      </ChartWidget>

      {/* Agent List */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Status Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {agentStatusData.map((status, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="font-medium">{status.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {((status.value / totalAgents) * 100).toFixed(1)}%
                  </span>
                  <span className="font-semibold w-8 text-right">
                    {status.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
