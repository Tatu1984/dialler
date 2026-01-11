'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { AgentCard, AgentStatus } from './components/agent-card';
import { QueueWidget } from './components/queue-widget';
import { LiveCallsTable, CallStatus } from './components/live-calls-table';
import {
  Users,
  Phone,
  TrendingUp,
  Clock,
  Activity,
  MessageSquare,
  Bell,
  Settings,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgents, useQueues } from '@/hooks/use-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Map agent states from API to component status
const mapAgentState = (state: string): AgentStatus => {
  const stateMap: Record<string, AgentStatus> = {
    'available': 'available',
    'on_call': 'on-call',
    'on-call': 'on-call',
    'wrap_up': 'wrap-up',
    'wrap-up': 'wrap-up',
    'break': 'break',
    'away': 'away',
    'offline': 'offline',
  };
  return stateMap[state?.toLowerCase()] || 'offline';
};

export default function SupervisorDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch real data from API
  const { data: agentsData, isLoading: agentsLoading, error: agentsError } = useAgents();
  const { data: queuesData, isLoading: queuesLoading, error: queuesError } = useQueues();

  const agents = agentsData?.items || [];
  const queues = queuesData?.items || [];

  // Transform agents data for the component
  const transformedAgents = agents.map((agent: any) => ({
    id: agent.id,
    name: agent.user ? `${agent.user.firstName} ${agent.user.lastName}` : 'Unknown Agent',
    avatar: '',
    status: mapAgentState(agent.currentState),
    stats: {
      callsToday: agent.stats?.callsToday || 0,
      talkTime: agent.stats?.talkTime || '0h 0m',
      avgHandleTime: agent.stats?.avgHandleTime || '0:00',
    },
  }));

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
  }));

  // For active calls, we'll show agents that are on-call
  const activeCalls = transformedAgents
    .filter((a: any) => a.status === 'on-call')
    .map((agent: any, index: number) => ({
      id: `c${index + 1}`,
      agentName: agent.name,
      customerNumber: 'In progress',
      duration: '00:00',
      queue: 'General',
      status: 'talking' as CallStatus,
      direction: 'inbound' as const,
    }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate summary statistics
  const totalAgents = transformedAgents.length;
  const availableAgents = transformedAgents.filter((a: any) => a.status === 'available').length;
  const onCallAgents = transformedAgents.filter((a: any) => a.status === 'on-call').length;
  const totalCallsWaiting = transformedQueues.reduce((sum: number, q: any) => sum + q.callsWaiting, 0);
  const avgServiceLevel = transformedQueues.length > 0
    ? Math.round(transformedQueues.reduce((sum: number, q: any) => sum + q.serviceLevel, 0) / transformedQueues.length)
    : 0;

  const isLoading = agentsLoading || queuesLoading;
  const hasError = agentsError || queuesError;

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Supervisor Dashboard</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load dashboard data. Please refresh the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supervisor Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time contact center monitoring and control
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Current Time</div>
            <div className="text-lg font-semibold font-mono">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="icon"
            onClick={() => setAutoRefresh(!autoRefresh)}
            title="Auto-refresh"
          >
            <RefreshCw className={cn('h-4 w-4', autoRefresh && 'animate-spin')} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Supervisor Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <MessageSquare className="mr-2 h-4 w-4" />
                Broadcast Message
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell className="mr-2 h-4 w-4" />
                Send Alert
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Activity className="mr-2 h-4 w-4" />
                View Reports
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Dashboard Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgents}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 font-semibold">{availableAgents} available</span>
              {' • '}
              <span className="text-blue-500 font-semibold">{onCallAgents} on call</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Waiting</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCallsWaiting}</div>
            <p className="text-xs text-muted-foreground">
              Across {transformedQueues.length} queues
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Level</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-2xl font-bold',
              avgServiceLevel >= 80 ? 'text-green-500' : 'text-red-500'
            )}>
              {avgServiceLevel}%
            </div>
            <p className="text-xs text-muted-foreground">
              Target: 80%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCalls.length}</div>
            <p className="text-xs text-muted-foreground">
              In progress now
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="calls">Active Calls</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Queue Status */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Queue Status</h2>
            {transformedQueues.length === 0 ? (
              <p className="text-muted-foreground">No queues configured</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {transformedQueues.map((queue: any) => (
                  <QueueWidget key={queue.id} queue={queue} />
                ))}
              </div>
            )}
          </div>

          {/* Agent Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Agent Status</h2>
              <div className="flex gap-2">
                <Badge variant="success" className="gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Available ({availableAgents})
                </Badge>
                <Badge variant="default" className="gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  On Call ({onCallAgents})
                </Badge>
              </div>
            </div>
            {transformedAgents.length === 0 ? (
              <p className="text-muted-foreground">No agents available</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {transformedAgents.slice(0, 6).map((agent: any) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onListen={(id) => console.log('Listen to agent:', id)}
                    onWhisper={(id) => console.log('Whisper to agent:', id)}
                    onBarge={(id) => console.log('Barge in on agent:', id)}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">All Agents</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Filter by Status
              </Button>
              <Button variant="outline" size="sm">
                Filter by Team
              </Button>
            </div>
          </div>
          {transformedAgents.length === 0 ? (
            <p className="text-muted-foreground">No agents available</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {transformedAgents.map((agent: any) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onListen={(id) => console.log('Listen to agent:', id)}
                  onWhisper={(id) => console.log('Whisper to agent:', id)}
                  onBarge={(id) => console.log('Barge in on agent:', id)}
                  onForceBreak={(id) => console.log('Force break agent:', id)}
                  onForceLogout={(id) => console.log('Force logout agent:', id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calls" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active Calls</h2>
            <Badge variant="outline">
              {activeCalls.length} active
            </Badge>
          </div>
          {activeCalls.length === 0 ? (
            <p className="text-muted-foreground">No active calls</p>
          ) : (
            <LiveCallsTable
              calls={activeCalls}
              onListen={(id) => console.log('Listen to call:', id)}
              onWhisper={(id) => console.log('Whisper on call:', id)}
              onBarge={(id) => console.log('Barge into call:', id)}
              onDisconnect={(id) => console.log('Disconnect call:', id)}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
