'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Phone,
  PhoneOff,
  Pause,
  MoreVertical,
  Headphones,
  MessageSquare,
  UserX,
} from 'lucide-react';

export type AgentStatus =
  | 'available'
  | 'on-call'
  | 'wrap-up'
  | 'break'
  | 'offline'
  | 'away';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    avatar?: string;
    status: AgentStatus;
    currentCall?: {
      phoneNumber: string;
      duration: string;
      queue: string;
    };
    stats: {
      callsToday: number;
      talkTime: string;
      avgHandleTime: string;
    };
  };
  onListen?: (agentId: string) => void;
  onWhisper?: (agentId: string) => void;
  onBarge?: (agentId: string) => void;
  onForceBreak?: (agentId: string) => void;
  onForceLogout?: (agentId: string) => void;
}

const statusConfig: Record<
  AgentStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary'; color: string }
> = {
  available: { label: 'Available', variant: 'success', color: 'bg-green-500' },
  'on-call': { label: 'On Call', variant: 'default', color: 'bg-blue-500' },
  'wrap-up': { label: 'Wrap-Up', variant: 'warning', color: 'bg-yellow-500' },
  break: { label: 'Break', variant: 'secondary', color: 'bg-gray-500' },
  offline: { label: 'Offline', variant: 'destructive', color: 'bg-red-500' },
  away: { label: 'Away', variant: 'secondary', color: 'bg-orange-500' },
};

export function AgentCard({
  agent,
  onListen,
  onWhisper,
  onBarge,
  onForceBreak,
  onForceLogout,
}: AgentCardProps) {
  const status = statusConfig[agent.status];
  const initials = agent.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={agent.avatar} alt={agent.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div
                className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${status.color}`}
              />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{agent.name}</h3>
              <Badge variant={status.variant} className="text-xs mt-1">
                {status.label}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Agent Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {agent.status === 'on-call' && (
                <>
                  <DropdownMenuItem onClick={() => onListen?.(agent.id)}>
                    <Headphones className="mr-2 h-4 w-4" />
                    Listen
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onWhisper?.(agent.id)}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Whisper
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBarge?.(agent.id)}>
                    <Phone className="mr-2 h-4 w-4" />
                    Barge In
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => onForceBreak?.(agent.id)}>
                <Pause className="mr-2 h-4 w-4" />
                Force Break
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onForceLogout?.(agent.id)}
                className="text-destructive"
              >
                <UserX className="mr-2 h-4 w-4" />
                Force Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {agent.currentCall && agent.status === 'on-call' && (
          <div className="bg-muted rounded-md p-2 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <Phone className="h-3 w-3 text-blue-500" />
              <span className="font-mono">{agent.currentCall.phoneNumber}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{agent.currentCall.queue}</span>
              <span className="font-mono">{agent.currentCall.duration}</span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{agent.stats.callsToday}</div>
            <div className="text-xs text-muted-foreground">Calls</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold">{agent.stats.talkTime}</div>
            <div className="text-xs text-muted-foreground">Talk Time</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold">{agent.stats.avgHandleTime}</div>
            <div className="text-xs text-muted-foreground">Avg AHT</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
