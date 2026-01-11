'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

export interface Team {
  id: string;
  name: string;
  memberCount: number;
}

interface TeamSelectorProps {
  selectedTeams: string[];
  onChange: (teamIds: string[]) => void;
  disabled?: boolean;
}

// Mock teams data
const MOCK_TEAMS: Team[] = [
  { id: '1', name: 'Sales Team', memberCount: 24 },
  { id: '2', name: 'Support Team', memberCount: 18 },
  { id: '3', name: 'Collections Team', memberCount: 12 },
  { id: '4', name: 'Retention Team', memberCount: 8 },
  { id: '5', name: 'Customer Success', memberCount: 15 },
];

export function TeamSelector({ selectedTeams, onChange, disabled }: TeamSelectorProps) {
  const [open, setOpen] = useState(false);

  const toggleTeam = (teamId: string) => {
    if (selectedTeams.includes(teamId)) {
      onChange(selectedTeams.filter(id => id !== teamId));
    } else {
      onChange([...selectedTeams, teamId]);
    }
  };

  const selectedTeamNames = MOCK_TEAMS
    .filter(team => selectedTeams.includes(team.id))
    .map(team => team.name);

  return (
    <div className="space-y-2">
      <Label>Teams</Label>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedTeams.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedTeamNames.map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">Select teams...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Teams</DialogTitle>
            <DialogDescription>
              Choose one or more teams for this user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {MOCK_TEAMS.map((team) => (
              <div
                key={team.id}
                className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent cursor-pointer"
                onClick={() => toggleTeam(team.id)}
              >
                <Checkbox
                  checked={selectedTeams.includes(team.id)}
                  onCheckedChange={() => toggleTeam(team.id)}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{team.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {team.memberCount} members
                  </p>
                </div>
                {selectedTeams.includes(team.id) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
