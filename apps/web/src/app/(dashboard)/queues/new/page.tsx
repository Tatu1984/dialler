'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { AgentAssignment } from '../components/agent-assignment';

export default function NewQueuePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    serviceLevelTarget: 80,
    serviceLevelSeconds: 20,
    maxWaitTime: 300,
    priority: 5,
    strategy: 'round-robin',
    timeout: 30,
    maxCallers: 50,
    musicOnHold: 'default',
  });

  const [selectedAgents, setSelectedAgents] = useState<any[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Queue name is required';
    }

    if (formData.serviceLevelTarget < 0 || formData.serviceLevelTarget > 100) {
      newErrors.serviceLevelTarget = 'Service level must be between 0 and 100';
    }

    if (formData.serviceLevelSeconds <= 0) {
      newErrors.serviceLevelSeconds = 'Service level time must be greater than 0';
    }

    if (selectedAgents.length === 0) {
      newErrors.agents = 'At least one agent must be assigned to the queue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    console.log('Creating queue:', {
      ...formData,
      agents: selectedAgents,
      requiredSkills,
    });

    // TODO: Implement API call
    // router.push('/queues');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/queues">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Queue</h1>
          <p className="text-muted-foreground">
            Set up a new call queue with routing rules and agent assignments
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Queue identification and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Queue Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Customer Support"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this queue's purpose"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Queue Priority</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                max="10"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Priority level (0-10). Higher numbers = higher priority
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Service Level Target */}
        <Card>
          <CardHeader>
            <CardTitle>Service Level Target</CardTitle>
            <CardDescription>
              Define your service level objectives (e.g., 80% of calls answered in 20 seconds)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="serviceLevelTarget">
                  Service Level Target (%) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="serviceLevelTarget"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.serviceLevelTarget}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceLevelTarget: parseInt(e.target.value) })
                  }
                  className={errors.serviceLevelTarget ? 'border-destructive' : ''}
                />
                {errors.serviceLevelTarget && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.serviceLevelTarget}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Percentage of calls to answer within target time
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceLevelSeconds">
                  Target Time (seconds) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="serviceLevelSeconds"
                  type="number"
                  min="1"
                  value={formData.serviceLevelSeconds}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceLevelSeconds: parseInt(e.target.value) })
                  }
                  className={errors.serviceLevelSeconds ? 'border-destructive' : ''}
                />
                {errors.serviceLevelSeconds && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.serviceLevelSeconds}
                  </p>
                )}
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
                min="0"
                value={formData.maxWaitTime}
                onChange={(e) =>
                  setFormData({ ...formData, maxWaitTime: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Disconnect callers after this duration (0 = no limit)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Routing Strategy */}
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
                value={formData.strategy}
                onValueChange={(value) => setFormData({ ...formData, strategy: value })}
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timeout">Ring Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min="5"
                  value={formData.timeout}
                  onChange={(e) =>
                    setFormData({ ...formData, timeout: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  How long to ring each agent
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxCallers">Maximum Callers</Label>
                <Input
                  id="maxCallers"
                  type="number"
                  min="0"
                  value={formData.maxCallers}
                  onChange={(e) =>
                    setFormData({ ...formData, maxCallers: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of callers in queue (0 = unlimited)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Music on Hold */}
        <Card>
          <CardHeader>
            <CardTitle>Music on Hold</CardTitle>
            <CardDescription>
              Select the music class for callers on hold
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="musicOnHold">Music Class</Label>
              <Select
                value={formData.musicOnHold}
                onValueChange={(value) => setFormData({ ...formData, musicOnHold: value })}
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
          </CardContent>
        </Card>

        {/* Agent Assignment */}
        <div>
          <AgentAssignment
            selectedAgents={selectedAgents}
            onAgentsChange={setSelectedAgents}
            requiredSkills={requiredSkills}
          />
          {errors.agents && (
            <Card className="mt-4 border-destructive">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {errors.agents}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/queues">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" />
            Create Queue
          </Button>
        </div>
      </form>
    </div>
  );
}
