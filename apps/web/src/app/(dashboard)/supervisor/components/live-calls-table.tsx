'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Headphones, MessageSquare, Phone, MoreVertical, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CallStatus = 'talking' | 'hold' | 'wrap-up' | 'ringing';

interface LiveCall {
  id: string;
  agentName: string;
  customerNumber: string;
  duration: string;
  queue: string;
  status: CallStatus;
  direction: 'inbound' | 'outbound';
}

interface LiveCallsTableProps {
  calls: LiveCall[];
  onListen?: (callId: string) => void;
  onWhisper?: (callId: string) => void;
  onBarge?: (callId: string) => void;
  onDisconnect?: (callId: string) => void;
}

const statusConfig: Record<
  CallStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' }
> = {
  talking: { label: 'Talking', variant: 'success' },
  hold: { label: 'On Hold', variant: 'warning' },
  'wrap-up': { label: 'Wrap-Up', variant: 'secondary' },
  ringing: { label: 'Ringing', variant: 'default' },
};

export function LiveCallsTable({
  calls,
  onListen,
  onWhisper,
  onBarge,
  onDisconnect,
}: LiveCallsTableProps) {
  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Phone className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Active Calls</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Active calls will appear here when agents are on calls
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Queue</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call) => {
            const status = statusConfig[call.status];
            return (
              <TableRow key={call.id}>
                <TableCell className="font-medium">{call.agentName}</TableCell>
                <TableCell>
                  <span className="font-mono text-sm">{call.customerNumber}</span>
                </TableCell>
                <TableCell>{call.queue}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {call.direction}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'font-mono text-sm',
                      call.status === 'talking' && 'text-green-600 font-semibold'
                    )}
                  >
                    {call.duration}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {call.status === 'talking' && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onListen?.(call.id)}
                          title="Listen"
                        >
                          <Headphones className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onWhisper?.(call.id)}
                          title="Whisper"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onBarge?.(call.id)}
                          title="Barge In"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Call Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {call.status === 'talking' && (
                          <>
                            <DropdownMenuItem onClick={() => onListen?.(call.id)}>
                              <Headphones className="mr-2 h-4 w-4" />
                              Listen
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onWhisper?.(call.id)}>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Whisper
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onBarge?.(call.id)}>
                              <Phone className="mr-2 h-4 w-4" />
                              Barge In
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => onDisconnect?.(call.id)}
                          className="text-destructive"
                        >
                          <PhoneOff className="mr-2 h-4 w-4" />
                          Disconnect Call
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
