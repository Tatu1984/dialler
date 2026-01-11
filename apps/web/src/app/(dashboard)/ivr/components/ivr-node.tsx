'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Phone,
  Menu,
  Users,
  Clock,
  MessageSquare,
  GitBranch,
  Volume2,
  Settings,
  Voicemail,
  X,
} from 'lucide-react';

export type IVRNodeType =
  | 'welcome'
  | 'menu'
  | 'queue'
  | 'time-condition'
  | 'message'
  | 'branch'
  | 'play-audio'
  | 'voicemail'
  | 'hangup';

export interface IVRNode {
  id: string;
  type: IVRNodeType;
  title: string;
  description?: string;
  config?: Record<string, any>;
  position?: { x: number; y: number };
}

interface IVRNodeProps {
  node: IVRNode;
  isSelected?: boolean;
  onSelect?: (node: IVRNode) => void;
  onDelete?: (nodeId: string) => void;
}

const nodeIcons: Record<IVRNodeType, any> = {
  welcome: Phone,
  menu: Menu,
  queue: Users,
  'time-condition': Clock,
  message: MessageSquare,
  branch: GitBranch,
  'play-audio': Volume2,
  voicemail: Voicemail,
  hangup: X,
};

const nodeColors: Record<IVRNodeType, string> = {
  welcome: 'bg-blue-500',
  menu: 'bg-purple-500',
  queue: 'bg-green-500',
  'time-condition': 'bg-orange-500',
  message: 'bg-yellow-500',
  branch: 'bg-pink-500',
  'play-audio': 'bg-indigo-500',
  voicemail: 'bg-red-500',
  hangup: 'bg-gray-500',
};

export function IVRNodeComponent({ node, isSelected, onSelect, onDelete }: IVRNodeProps) {
  const Icon = nodeIcons[node.type];
  const colorClass = nodeColors[node.type];

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => onSelect?.(node)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass} text-white flex-shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-sm truncate">{node.title}</h4>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(node.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {node.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {node.description}
              </p>
            )}
            <Badge variant="outline" className="mt-2 text-xs">
              {node.type}
            </Badge>
          </div>
        </div>

        {/* Connection points */}
        <div className="flex justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>Input</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Output</span>
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
