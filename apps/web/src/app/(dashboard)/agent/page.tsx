'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Phone,
  PhoneOff,
  Clock,
  TrendingUp,
  Users,
  PhoneForwarded,
  Target,
} from 'lucide-react';
import { useAgentDashboard, useUpdateAgentState } from '@/hooks/use-api';

// Import agent desktop components
import { AgentStatusSelector, type AgentStatus } from './components/agent-status-selector';
import { Softphone } from './components/softphone';
import { CustomerPanel } from './components/customer-panel';
import { ScriptPanel } from './components/script-panel';
import { DispositionPanel } from './components/disposition-panel';

export default function AgentDashboard() {
  const { user } = useAuthStore();
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('available');
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferNumber, setTransferNumber] = useState('');
  const [sessionTime, setSessionTime] = useState(9870); // seconds

  // Fetch dashboard data from API
  const { data: dashboardData, isLoading } = useAgentDashboard();
  const updateAgentState = useUpdateAgentState();

  const stats = dashboardData?.stats || {
    callsToday: 0,
    avgHandleTime: '0:00',
    conversions: 0,
    conversionRate: '0%',
    queueWaiting: 0,
  };

  const handleStatusChange = async (status: AgentStatus, reason?: string) => {
    setAgentStatus(status);
    try {
      // Map UI status to API state
      const stateMap: Record<AgentStatus, string> = {
        'available': 'available',
        'break': 'break',
        'lunch': 'lunch',
        'training': 'training',
        'meeting': 'meeting',
        'offline': 'offline',
      };
      await updateAgentState.mutateAsync({
        id: user?.id || '',
        state: stateMap[status] || status,
        reason,
      });
    } catch (err) {
      console.error('Failed to update agent state:', err);
    }
  };

  const handleTransfer = () => {
    console.log('Transferring call to:', transferNumber);
    setIsTransferDialogOpen(false);
    setTransferNumber('');
  };

  const formatSessionTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Desktop</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}! {user?.tenant.name}
          </p>
        </div>
      </div>

      {/* Status Bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <AgentStatusSelector
            currentStatus={agentStatus}
            onStatusChange={handleStatusChange}
          />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Session:</span>
              <span className="text-muted-foreground">{formatSessionTime(sessionTime)}</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="sm">
              <PhoneOff className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.callsToday}</div>
                <p className="text-xs text-muted-foreground">Today's total</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Handle Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.avgHandleTime}</div>
                <p className="text-xs text-muted-foreground">Target: 5:00</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.conversions}</div>
                <p className="text-xs text-muted-foreground">{stats.conversionRate} conversion rate</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Queue</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.queueWaiting}</div>
                <p className="text-xs text-muted-foreground">Waiting callers</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Agent Desktop Layout */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left Column - Softphone */}
        <div className="lg:col-span-3">
          <Softphone
            onTransfer={() => setIsTransferDialogOpen(true)}
            onAnswer={() => console.log('Call answered')}
            onHangup={() => console.log('Call hung up')}
            onHold={() => console.log('Call on hold')}
            onMute={() => console.log('Call muted')}
            onDial={(number) => console.log('Dialing:', number)}
          />
        </div>

        {/* Middle Column - Customer Info & Script */}
        <div className="lg:col-span-5 space-y-4">
          <CustomerPanel />
          <ScriptPanel />
        </div>

        {/* Right Column - Disposition */}
        <div className="lg:col-span-4">
          <DispositionPanel
            onSubmit={(data) => {
              console.log('Disposition submitted:', data);
            }}
          />
        </div>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneForwarded className="h-5 w-5" />
              Transfer Call
            </DialogTitle>
            <DialogDescription>
              Enter the number or select an agent to transfer this call to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-number">Transfer To</Label>
              <Input
                id="transfer-number"
                placeholder="Enter phone number or extension..."
                value={transferNumber}
                onChange={(e) => setTransferNumber(e.target.value)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Quick Transfer to Agents</Label>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setTransferNumber('ext:101');
                    handleTransfer();
                  }}
                >
                  Sarah Johnson - Sales (Ext. 101)
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setTransferNumber('ext:102');
                    handleTransfer();
                  }}
                >
                  Mike Davis - Support (Ext. 102)
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setTransferNumber('ext:103');
                    handleTransfer();
                  }}
                >
                  Tom Wilson - Manager (Ext. 103)
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsTransferDialogOpen(false);
                setTransferNumber('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={!transferNumber}>
              <PhoneForwarded className="h-4 w-4 mr-2" />
              Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
