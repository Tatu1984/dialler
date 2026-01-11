'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Save,
  Phone,
  Users,
  Clock,
  TrendingUp,
  Settings,
  Music,
  AlertCircle,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { AgentAssignment } from '../components/agent-assignment';

interface Agent {
  id: string;
  name: string;
  email: string;
  skills: string[];
  skillLevel: number;
  status: 'available' | 'busy' | 'offline';
}

export default function QueueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queueId = params.id as string;

  // Mock queue data
  const [queueData, setQueueData] = useState({
    id: queueId,
    name: 'Customer Support',
    description: 'General customer support inquiries',
    status: 'active',
    serviceLevelTarget: 80,
    serviceLevelSeconds: 20,
    maxWaitTime: 300,
    priority: 5,
    strategy: 'ring-all',
    timeout: 30,
    retryDelay: 5,
    wrapupTime: 10,
    maxCallers: 50,
    announceFrequency: 30,
    announceHoldtime: true,
    musicOnHold: 'default',
    overflowEnabled: false,
    overflowQueue: '',
    overflowThreshold: 10,
  });

  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([
    { id: '1', name: 'John Doe', email: 'john@example.com', skills: ['Sales', 'Support'], skillLevel: 5, status: 'available' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', skills: ['Support', 'Technical'], skillLevel: 4, status: 'available' },
  ]);

  // Real-time stats (mock)
  const realtimeStats = {
    callsWaiting: 12,
    agentsAvailable: 8,
    agentsTotal: 15,
    serviceLevel: 85,
    averageWaitTime: 45,
    longestWaitTime: 180,
    callsAnswered: 234,
    callsAbandoned: 12,
    abandonRate: 4.9,
  };

  const handleSave = () => {
    console.log('Saving queue settings:', queueData);
    // TODO: Implement API call
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/queues">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{queueData.name}</h1>
              <Badge variant={queueData.status === 'active' ? 'success' : 'outline'}>
                {queueData.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{queueData.description}</p>
          </div>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Real-time Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Calls Waiting</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realtimeStats.callsWaiting}</div>
            <p className="text-xs text-muted-foreground">
              Longest wait: {realtimeStats.longestWaitTime}s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {realtimeStats.agentsAvailable}/{realtimeStats.agentsTotal}
            </div>
            <p className="text-xs text-muted-foreground">
              Available/Total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Service Level</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realtimeStats.serviceLevel}%</div>
            <p className="text-xs text-green-500">
              Target: {queueData.serviceLevelTarget}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Abandon Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realtimeStats.abandonRate}%</div>
            <p className="text-xs text-muted-foreground">
              {realtimeStats.callsAbandoned} abandoned today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Users className="h-4 w-4 mr-2" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="routing">
            <Activity className="h-4 w-4 mr-2" />
            Routing
          </TabsTrigger>
          <TabsTrigger value="overflow">
            <AlertCircle className="h-4 w-4 mr-2" />
            Overflow
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Queue Configuration</CardTitle>
              <CardDescription>
                Basic queue settings and identification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Queue Name</Label>
                <Input
                  id="name"
                  value={queueData.name}
                  onChange={(e) => setQueueData({ ...queueData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={queueData.description}
                  onChange={(e) => setQueueData({ ...queueData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="status">Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable this queue
                  </p>
                </div>
                <Switch
                  id="status"
                  checked={queueData.status === 'active'}
                  onCheckedChange={(checked) =>
                    setQueueData({ ...queueData, status: checked ? 'active' : 'inactive' })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Level Target</CardTitle>
              <CardDescription>
                Define your service level objectives
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="serviceLevel">Service Level Target (%)</Label>
                  <Input
                    id="serviceLevel"
                    type="number"
                    value={queueData.serviceLevelTarget}
                    onChange={(e) =>
                      setQueueData({ ...queueData, serviceLevelTarget: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentage of calls to answer within target time
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceLevelSeconds">Target Time (seconds)</Label>
                  <Input
                    id="serviceLevelSeconds"
                    type="number"
                    value={queueData.serviceLevelSeconds}
                    onChange={(e) =>
                      setQueueData({ ...queueData, serviceLevelSeconds: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Answer calls within this many seconds
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxWaitTime">Maximum Wait Time (seconds)</Label>
                <Input
                  id="maxWaitTime"
                  type="number"
                  value={queueData.maxWaitTime}
                  onChange={(e) =>
                    setQueueData({ ...queueData, maxWaitTime: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Disconnect callers after this duration
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Music className="h-5 w-5 inline mr-2" />
                Music on Hold
              </CardTitle>
              <CardDescription>
                Configure hold music and announcements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="moh">Music on Hold Class</Label>
                <Select
                  value={queueData.musicOnHold}
                  onValueChange={(value) =>
                    setQueueData({ ...queueData, musicOnHold: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="jazz">Jazz</SelectItem>
                    <SelectItem value="classical">Classical</SelectItem>
                    <SelectItem value="rock">Rock</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="announceFreq">Announce Frequency (seconds)</Label>
                <Input
                  id="announceFreq"
                  type="number"
                  value={queueData.announceFrequency}
                  onChange={(e) =>
                    setQueueData({ ...queueData, announceFrequency: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  How often to play position announcements
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="announceHold">Announce Hold Time</Label>
                  <p className="text-sm text-muted-foreground">
                    Tell callers their estimated wait time
                  </p>
                </div>
                <Switch
                  id="announceHold"
                  checked={queueData.announceHoldtime}
                  onCheckedChange={(checked) =>
                    setQueueData({ ...queueData, announceHoldtime: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents">
          <AgentAssignment
            selectedAgents={selectedAgents}
            onAgentsChange={setSelectedAgents}
          />
        </TabsContent>

        {/* Routing Tab */}
        <TabsContent value="routing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Routing Strategy</CardTitle>
              <CardDescription>
                Configure how calls are distributed to agents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="strategy">Ring Strategy</Label>
                <Select
                  value={queueData.strategy}
                  onValueChange={(value) =>
                    setQueueData({ ...queueData, strategy: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ring-all">Ring All - Ring all available agents</SelectItem>
                    <SelectItem value="round-robin">Round Robin - Distribute evenly</SelectItem>
                    <SelectItem value="least-recent">Least Recent - Ring least recently called</SelectItem>
                    <SelectItem value="fewest-calls">Fewest Calls - Ring agent with fewest calls</SelectItem>
                    <SelectItem value="random">Random - Ring random available agent</SelectItem>
                    <SelectItem value="linear">Linear - Ring in specified order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="timeout">Ring Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={queueData.timeout}
                    onChange={(e) =>
                      setQueueData({ ...queueData, timeout: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retryDelay">Retry Delay (seconds)</Label>
                  <Input
                    id="retryDelay"
                    type="number"
                    value={queueData.retryDelay}
                    onChange={(e) =>
                      setQueueData({ ...queueData, retryDelay: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wrapupTime">Wrap-up Time (seconds)</Label>
                  <Input
                    id="wrapupTime"
                    type="number"
                    value={queueData.wrapupTime}
                    onChange={(e) =>
                      setQueueData({ ...queueData, wrapupTime: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Queue Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  max="10"
                  value={queueData.priority}
                  onChange={(e) =>
                    setQueueData({ ...queueData, priority: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Priority level (0-10). Higher numbers = higher priority
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overflow Tab */}
        <TabsContent value="overflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overflow Settings</CardTitle>
              <CardDescription>
                Configure what happens when the queue reaches capacity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="overflowEnabled">Enable Overflow</Label>
                  <p className="text-sm text-muted-foreground">
                    Redirect calls when queue is full
                  </p>
                </div>
                <Switch
                  id="overflowEnabled"
                  checked={queueData.overflowEnabled}
                  onCheckedChange={(checked) =>
                    setQueueData({ ...queueData, overflowEnabled: checked })
                  }
                />
              </div>
              {queueData.overflowEnabled && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="overflowThreshold">Overflow Threshold</Label>
                    <Input
                      id="overflowThreshold"
                      type="number"
                      value={queueData.overflowThreshold}
                      onChange={(e) =>
                        setQueueData({ ...queueData, overflowThreshold: parseInt(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of calls in queue before overflow triggers
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="overflowQueue">Overflow Destination</Label>
                    <Select
                      value={queueData.overflowQueue}
                      onValueChange={(value) =>
                        setQueueData({ ...queueData, overflowQueue: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select overflow destination" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sales Queue</SelectItem>
                        <SelectItem value="technical">Technical Support</SelectItem>
                        <SelectItem value="voicemail">Voicemail</SelectItem>
                        <SelectItem value="callback">Callback Queue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
