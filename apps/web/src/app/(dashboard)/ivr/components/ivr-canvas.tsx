'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  Menu,
  Users,
  Clock,
  MessageSquare,
  GitBranch,
  Volume2,
  Voicemail,
  X,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react';
import { IVRNodeComponent, IVRNode, IVRNodeType } from './ivr-node';

interface IVRCanvasProps {
  nodes?: IVRNode[];
  onNodesChange?: (nodes: IVRNode[]) => void;
  selectedNode?: IVRNode | null;
  onNodeSelect?: (node: IVRNode | null) => void;
}

const nodeTemplates: Array<{ type: IVRNodeType; label: string; icon: any }> = [
  { type: 'welcome', label: 'Welcome Message', icon: Phone },
  { type: 'menu', label: 'Menu', icon: Menu },
  { type: 'queue', label: 'Route to Queue', icon: Users },
  { type: 'time-condition', label: 'Time Condition', icon: Clock },
  { type: 'message', label: 'Play Message', icon: MessageSquare },
  { type: 'branch', label: 'Branch', icon: GitBranch },
  { type: 'play-audio', label: 'Play Audio', icon: Volume2 },
  { type: 'voicemail', label: 'Voicemail', icon: Voicemail },
  { type: 'hangup', label: 'Hangup', icon: X },
];

export function IVRCanvas({
  nodes = [],
  onNodesChange,
  selectedNode,
  onNodeSelect,
}: IVRCanvasProps) {
  const [zoom, setZoom] = useState(100);

  const handleAddNode = (type: IVRNodeType) => {
    const newNode: IVRNode = {
      id: `node-${Date.now()}`,
      type,
      title: `New ${type} Node`,
      description: `Configure this ${type} node`,
      position: { x: 100, y: 100 + nodes.length * 150 },
    };

    if (onNodesChange) {
      onNodesChange([...nodes, newNode]);
    }

    if (onNodeSelect) {
      onNodeSelect(newNode);
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    if (onNodesChange) {
      onNodesChange(nodes.filter(node => node.id !== nodeId));
    }
    if (selectedNode?.id === nodeId && onNodeSelect) {
      onNodeSelect(null);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoom(100);

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Node Palette */}
      <div className="col-span-3 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Node Types</CardTitle>
            <CardDescription>
              Drag or click to add nodes to your IVR flow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {nodeTemplates.map(template => (
              <Button
                key={template.type}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAddNode(template.type)}
              >
                <template.icon className="h-4 w-4 mr-2" />
                {template.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Nodes</span>
              <Badge variant="secondary">{nodes.length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Connections</span>
              <Badge variant="secondary">0</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Canvas Area */}
      <div className="col-span-9">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">IVR Flow Canvas</CardTitle>
                <CardDescription>
                  Visual representation of your IVR call flow
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[3rem] text-center">
                  {zoom}%
                </span>
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetZoom}>
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed rounded-lg p-6 min-h-[600px] bg-muted/30"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
            >
              {nodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Phone className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Start Building Your IVR</h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    Add nodes from the palette on the left to create your call flow.
                    Connect them together to define how calls should be routed.
                  </p>
                  <Button onClick={() => handleAddNode('welcome')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Welcome Node
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {nodes.map((node, index) => (
                    <div key={node.id} className="relative">
                      <IVRNodeComponent
                        node={node}
                        isSelected={selectedNode?.id === node.id}
                        onSelect={onNodeSelect}
                        onDelete={handleDeleteNode}
                      />
                      {index < nodes.length - 1 && (
                        <div className="flex justify-center my-2">
                          <div className="w-0.5 h-8 bg-border" />
                        </div>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleAddNode('menu')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Node
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> This is a simplified IVR canvas placeholder. In production,
                this would be replaced with a full drag-and-drop visual flow builder using a library
                like React Flow or similar.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
