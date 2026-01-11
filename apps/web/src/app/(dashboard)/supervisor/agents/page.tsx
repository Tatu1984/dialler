'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AgentCard, AgentStatus } from '../components/agent-card';
import {
  Users,
  Search,
  Filter,
  Download,
  LayoutGrid,
  List,
  AlertCircle,
} from 'lucide-react';
import { useAgents, useTeams } from '@/hooks/use-api';

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

export default function AgentsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data from API
  const { data: agentsData, isLoading, error } = useAgents();
  const { data: teamsData } = useTeams();

  const agents = agentsData?.items || [];
  const teams = teamsData?.items || [];

  // Transform agents data for the component
  const transformedAgents = agents.map((agent: any) => ({
    id: agent.id,
    name: agent.user ? `${agent.user.firstName} ${agent.user.lastName}` : 'Unknown Agent',
    avatar: '',
    status: mapAgentState(agent.currentState),
    team: agent.team?.name || 'Unassigned',
    skill: agent.skills?.[0]?.name || 'General',
    stats: {
      callsToday: agent.stats?.callsToday || 0,
      talkTime: agent.stats?.talkTime || '0h 0m',
      avgHandleTime: agent.stats?.avgHandleTime || '0:00',
    },
    performance: {
      conversionRate: agent.performance?.conversionRate || 'N/A',
      satisfaction: agent.performance?.satisfaction || 0,
      adherence: agent.performance?.adherence || '0%',
    },
  }));

  // Filter agents
  const filteredAgents = transformedAgents.filter((agent: any) => {
    if (statusFilter !== 'all' && agent.status !== statusFilter) return false;
    if (teamFilter !== 'all' && agent.team !== teamFilter) return false;
    if (searchQuery && !agent.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Get unique teams for filter
  const uniqueTeams = Array.from(new Set(transformedAgents.map((a: any) => a.team)));

  // Calculate stats
  const totalAgents = filteredAgents.length;
  const availableAgents = filteredAgents.filter((a: any) => a.status === 'available').length;
  const onCallAgents = filteredAgents.filter((a: any) => a.status === 'on-call').length;
  const onBreakAgents = filteredAgents.filter((a: any) => a.status === 'break').length;

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
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
        <h1 className="text-3xl font-bold tracking-tight">Agent Management</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load agents. Please refresh the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Management</h1>
        <p className="text-muted-foreground">
          Monitor and manage all agents in real-time
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <div className="h-3 w-3 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{availableAgents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Call</CardTitle>
            <div className="h-3 w-3 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{onCallAgents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Break</CardTitle>
            <div className="h-3 w-3 rounded-full bg-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{onBreakAgents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="on-call">On Call</SelectItem>
              <SelectItem value="wrap-up">Wrap-up</SelectItem>
              <SelectItem value="break">Break</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {uniqueTeams.map((team: any) => (
                <SelectItem key={String(team)} value={String(team)}>{String(team)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Agent Display */}
      {viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAgents.map((agent: any) => (
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
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead>Calls Today</TableHead>
                  <TableHead>Talk Time</TableHead>
                  <TableHead>Avg AHT</TableHead>
                  <TableHead>Satisfaction</TableHead>
                  <TableHead>Adherence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map((agent: any) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          agent.status === 'available'
                            ? 'success'
                            : agent.status === 'on-call'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{agent.team}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {agent.skill}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {agent.stats.callsToday}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {agent.stats.talkTime}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {agent.stats.avgHandleTime}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">⭐</span>
                        <span className="font-semibold">
                          {agent.performance.satisfaction}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{agent.performance.adherence}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
