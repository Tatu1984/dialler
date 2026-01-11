'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Search, UserPlus, X, Star } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  email: string;
  skills: string[];
  skillLevel: number;
  status: 'available' | 'busy' | 'offline';
}

interface AgentAssignmentProps {
  selectedAgents?: Agent[];
  onAgentsChange?: (agents: Agent[]) => void;
  requiredSkills?: string[];
}

export function AgentAssignment({
  selectedAgents = [],
  onAgentsChange,
  requiredSkills = []
}: AgentAssignmentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Mock available agents
  const availableAgents: Agent[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', skills: ['Sales', 'Support'], skillLevel: 5, status: 'available' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', skills: ['Support', 'Technical'], skillLevel: 4, status: 'available' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', skills: ['Sales', 'Retention'], skillLevel: 3, status: 'busy' },
    { id: '4', name: 'Alice Williams', email: 'alice@example.com', skills: ['Technical', 'Support'], skillLevel: 5, status: 'available' },
    { id: '5', name: 'Charlie Brown', email: 'charlie@example.com', skills: ['Sales', 'Collections'], skillLevel: 4, status: 'offline' },
  ];

  const filteredAgents = availableAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !showAvailableOnly || agent.status === 'available';
    const notSelected = !selectedAgents.find(selected => selected.id === agent.id);
    return matchesSearch && matchesStatus && notSelected;
  });

  const handleAddAgent = (agent: Agent) => {
    if (onAgentsChange) {
      onAgentsChange([...selectedAgents, agent]);
    }
  };

  const handleRemoveAgent = (agentId: string) => {
    if (onAgentsChange) {
      onAgentsChange(selectedAgents.filter(agent => agent.id !== agentId));
    }
  };

  return (
    <div className="space-y-6">
      {/* Selected Agents */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Agents</CardTitle>
          <CardDescription>
            Agents currently assigned to this queue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedAgents.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No agents assigned yet. Add agents from the list below.
            </div>
          ) : (
            <div className="space-y-2">
              {selectedAgents.map(agent => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-accent/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{agent.name}</p>
                      <Badge variant={agent.status === 'available' ? 'success' : 'outline'} className="text-xs">
                        {agent.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{agent.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < agent.skillLevel ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">•</span>
                      <div className="flex gap-1">
                        {agent.skills.map(skill => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAgent(agent.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Agents */}
      <Card>
        <CardHeader>
          <CardTitle>Available Agents</CardTitle>
          <CardDescription>
            Select agents to add to this queue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Agents</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="available-only"
                checked={showAvailableOnly}
                onCheckedChange={setShowAvailableOnly}
              />
              <Label htmlFor="available-only">Show available agents only</Label>
            </div>
          </div>

          {/* Agent List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredAgents.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No agents found matching your criteria.
              </div>
            ) : (
              filteredAgents.map(agent => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{agent.name}</p>
                      <Badge variant={agent.status === 'available' ? 'success' : 'outline'} className="text-xs">
                        {agent.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{agent.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < agent.skillLevel ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">•</span>
                      <div className="flex gap-1">
                        {agent.skills.map(skill => (
                          <Badge
                            key={skill}
                            variant={requiredSkills.includes(skill) ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddAgent(agent)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
