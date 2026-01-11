'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Phone, Clock, Settings } from 'lucide-react';
import Link from 'next/link';

interface QueueCardProps {
  queue: {
    id: string;
    name: string;
    description?: string;
    callsWaiting: number;
    agentsAvailable: number;
    agentsTotal: number;
    serviceLevel: number;
    serviceLevelTarget: number;
    averageWaitTime: number;
    longestWaitTime: number;
    status: 'active' | 'inactive' | 'paused';
  };
}

export function QueueCard({ queue }: QueueCardProps) {
  const serviceLevelStatus = queue.serviceLevel >= queue.serviceLevelTarget ? 'success' : 'warning';

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle className="text-lg font-bold">{queue.name}</CardTitle>
          {queue.description && (
            <p className="text-sm text-muted-foreground mt-1">{queue.description}</p>
          )}
        </div>
        <Badge variant={queue.status === 'active' ? 'success' : queue.status === 'paused' ? 'warning' : 'outline'}>
          {queue.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span className="text-xs">Calls Waiting</span>
              </div>
              <p className="text-2xl font-bold">{queue.callsWaiting}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-xs">Agents Available</span>
              </div>
              <p className="text-2xl font-bold">
                {queue.agentsAvailable}
                <span className="text-sm text-muted-foreground">/{queue.agentsTotal}</span>
              </p>
            </div>
          </div>

          {/* Service Level */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Service Level</span>
              <span className={`font-semibold ${serviceLevelStatus === 'success' ? 'text-green-500' : 'text-yellow-500'}`}>
                {queue.serviceLevel}% / {queue.serviceLevelTarget}%
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${serviceLevelStatus === 'success' ? 'bg-green-500' : 'bg-yellow-500'}`}
                style={{ width: `${Math.min(queue.serviceLevel, 100)}%` }}
              />
            </div>
          </div>

          {/* Wait Times */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Avg Wait:</span>
              <span className="font-medium">{queue.averageWaitTime}s</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Longest:</span>
              <span className="font-medium">{queue.longestWaitTime}s</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Link href={`/queues/${queue.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </Link>
            <Link href={`/queues/${queue.id}`} className="flex-1">
              <Button className="w-full">View Details</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
