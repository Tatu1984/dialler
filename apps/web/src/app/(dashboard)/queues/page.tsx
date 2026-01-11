'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Phone,
  Users,
  Clock,
  TrendingUp,
  Filter
} from 'lucide-react';
import Link from 'next/link';
import { QueueCard } from './components/queue-card';

export default function QueuesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data
  const queues = [
    {
      id: '1',
      name: 'Customer Support',
      description: 'General customer support inquiries',
      callsWaiting: 12,
      agentsAvailable: 8,
      agentsTotal: 15,
      serviceLevel: 85,
      serviceLevelTarget: 80,
      averageWaitTime: 45,
      longestWaitTime: 180,
      status: 'active' as const,
    },
    {
      id: '2',
      name: 'Sales Queue',
      description: 'Inbound sales calls and lead follow-ups',
      callsWaiting: 5,
      agentsAvailable: 12,
      agentsTotal: 15,
      serviceLevel: 92,
      serviceLevelTarget: 85,
      averageWaitTime: 28,
      longestWaitTime: 90,
      status: 'active' as const,
    },
    {
      id: '3',
      name: 'Technical Support',
      description: 'Advanced technical support queue',
      callsWaiting: 3,
      agentsAvailable: 4,
      agentsTotal: 6,
      serviceLevel: 78,
      serviceLevelTarget: 80,
      averageWaitTime: 120,
      longestWaitTime: 300,
      status: 'active' as const,
    },
    {
      id: '4',
      name: 'Billing & Payments',
      description: 'Billing inquiries and payment processing',
      callsWaiting: 7,
      agentsAvailable: 5,
      agentsTotal: 8,
      serviceLevel: 88,
      serviceLevelTarget: 85,
      averageWaitTime: 52,
      longestWaitTime: 145,
      status: 'active' as const,
    },
    {
      id: '5',
      name: 'VIP Customer Queue',
      description: 'Priority queue for VIP customers',
      callsWaiting: 2,
      agentsAvailable: 3,
      agentsTotal: 4,
      serviceLevel: 95,
      serviceLevelTarget: 90,
      averageWaitTime: 15,
      longestWaitTime: 30,
      status: 'active' as const,
    },
    {
      id: '6',
      name: 'After Hours Support',
      description: 'Off-hours customer support',
      callsWaiting: 0,
      agentsAvailable: 0,
      agentsTotal: 5,
      serviceLevel: 0,
      serviceLevelTarget: 75,
      averageWaitTime: 0,
      longestWaitTime: 0,
      status: 'inactive' as const,
    },
  ];

  const totalCallsWaiting = queues.reduce((sum, q) => sum + q.callsWaiting, 0);
  const totalAgentsAvailable = queues.reduce((sum, q) => sum + q.agentsAvailable, 0);
  const totalAgents = queues.reduce((sum, q) => sum + q.agentsTotal, 0);
  const avgServiceLevel = Math.round(
    queues.filter(q => q.status === 'active').reduce((sum, q) => sum + q.serviceLevel, 0) /
    queues.filter(q => q.status === 'active').length
  );

  const filteredQueues = queues.filter(queue =>
    queue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    queue.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Queue Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage call queues in real-time
          </p>
        </div>
        <Link href="/queues/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Queue
          </Button>
        </Link>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Calls Waiting</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCallsWaiting}</div>
            <p className="text-xs text-muted-foreground">
              Across all active queues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAgentsAvailable}
              <span className="text-sm text-muted-foreground">/{totalAgents}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((totalAgentsAvailable / totalAgents) * 100)}% utilization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Service Level</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgServiceLevel}%</div>
            <p className="text-xs text-green-500">
              Above target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Queues</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queues.filter(q => q.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {queues.length} total queues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Queues</CardTitle>
              <CardDescription>
                {filteredQueues.length} queue{filteredQueues.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search queues..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Queue Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredQueues.map(queue => (
          <QueueCard key={queue.id} queue={queue} />
        ))}
      </div>

      {filteredQueues.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Phone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No queues found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Try adjusting your search or create a new queue to get started.
            </p>
            <Link href="/queues/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Queue
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
