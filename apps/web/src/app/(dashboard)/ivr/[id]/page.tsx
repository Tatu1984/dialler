'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Play,
  Phone,
  Settings,
  GitBranch,
  Activity,
} from 'lucide-react';
import { IVRCanvas } from '../components/ivr-canvas';
import { IVRNode } from '../components/ivr-node';

export default function IVRBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const ivrId = params.id as string;

  const [ivrData, setIvrData] = useState({
    id: ivrId,
    name: 'Main Menu',
    description: 'Primary customer service menu',
    status: 'active',
  });

  const [nodes, setNodes] = useState<IVRNode[]>([
    {
      id: 'node-1',
      type: 'welcome',
      title: 'Welcome Message',
      description: 'Play greeting to caller',
      config: { message: 'Thank you for calling NexusDialer' },
    },
    {
      id: 'node-2',
      type: 'menu',
      title: 'Main Menu',
      description: 'Present menu options',
      config: {
        options: [
          { digit: '1', destination: 'Sales' },
          { digit: '2', destination: 'Support' },
          { digit: '3', destination: 'Billing' },
        ],
      },
    },
    {
      id: 'node-3',
      type: 'queue',
      title: 'Route to Support Queue',
      description: 'Send caller to support queue',
      config: { queueId: 'support-queue-1' },
    },
  ]);

  const [selectedNode, setSelectedNode] = useState<IVRNode | null>(null);

  const handleSave = () => {
    console.log('Saving IVR:', { ...ivrData, nodes });
    // TODO: Implement API call
  };

  const handleTest = () => {
    console.log('Testing IVR:', ivrId);
    // TODO: Implement IVR test functionality
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ivr">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{ivrData.name}</h1>
              <Badge variant={ivrData.status === 'active' ? 'success' : 'outline'}>
                {ivrData.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{ivrData.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleTest}>
            <Play className="h-4 w-4 mr-2" />
            Test IVR
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nodes.length}</div>
            <p className="text-xs text-muted-foreground">
              In this flow
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,243</div>
            <p className="text-xs text-muted-foreground">
              Through this IVR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-green-500">
              +5% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42s</div>
            <p className="text-xs text-muted-foreground">
              Per call
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList>
          <TabsTrigger value="builder">
            <GitBranch className="h-4 w-4 mr-2" />
            Flow Builder
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="properties">
            <Settings className="h-4 w-4 mr-2" />
            Node Properties
          </TabsTrigger>
        </TabsList>

        {/* Flow Builder Tab */}
        <TabsContent value="builder">
          <IVRCanvas
            nodes={nodes}
            onNodesChange={setNodes}
            selectedNode={selectedNode}
            onNodeSelect={setSelectedNode}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>IVR Configuration</CardTitle>
              <CardDescription>
                Basic IVR settings and identification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">IVR Name</Label>
                <Input
                  id="name"
                  value={ivrData.name}
                  onChange={(e) => setIvrData({ ...ivrData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={ivrData.description}
                  onChange={(e) => setIvrData({ ...ivrData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={ivrData.status}
                  onValueChange={(value) => setIvrData({ ...ivrData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Phone Numbers</CardTitle>
              <CardDescription>
                Phone numbers associated with this IVR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Assigned Numbers</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="font-mono">+1-800-555-0100</span>
                    <Badge variant="success">Primary</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="font-mono">+1-800-555-0101</span>
                    <Badge variant="secondary">Backup</Badge>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                <Phone className="h-4 w-4 mr-2" />
                Add Phone Number
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
              <CardDescription>
                Configure when this IVR should be active
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input id="startTime" type="time" defaultValue="09:00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input id="endTime" type="time" defaultValue="17:00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Operating Days</Label>
                <div className="flex gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <Button key={day} variant="outline" size="sm">
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Node Properties Tab */}
        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle>Node Properties</CardTitle>
              <CardDescription>
                {selectedNode
                  ? `Configure properties for: ${selectedNode.title}`
                  : 'Select a node from the canvas to edit its properties'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nodeTitle">Node Title</Label>
                    <Input
                      id="nodeTitle"
                      value={selectedNode.title}
                      onChange={(e) => {
                        const updatedNode = { ...selectedNode, title: e.target.value };
                        setSelectedNode(updatedNode);
                        setNodes(nodes.map(n => n.id === selectedNode.id ? updatedNode : n));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nodeDescription">Description</Label>
                    <Textarea
                      id="nodeDescription"
                      value={selectedNode.description || ''}
                      onChange={(e) => {
                        const updatedNode = { ...selectedNode, description: e.target.value };
                        setSelectedNode(updatedNode);
                        setNodes(nodes.map(n => n.id === selectedNode.id ? updatedNode : n));
                      }}
                      rows={3}
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">
                      <strong>Type:</strong> {selectedNode.type}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Additional type-specific configuration would appear here based on the node type.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Node Selected</h3>
                  <p className="text-muted-foreground max-w-md">
                    Click on a node in the Flow Builder to edit its properties here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
