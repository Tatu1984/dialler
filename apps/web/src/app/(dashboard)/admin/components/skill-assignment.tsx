'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface SkillAssignment {
  skillId: string;
  proficiency: number; // 1-10
}

interface SkillAssignmentProps {
  assignments: SkillAssignment[];
  onChange: (assignments: SkillAssignment[]) => void;
  disabled?: boolean;
}

// Mock skills data
const MOCK_SKILLS: Skill[] = [
  { id: '1', name: 'English', category: 'Language' },
  { id: '2', name: 'Spanish', category: 'Language' },
  { id: '3', name: 'French', category: 'Language' },
  { id: '4', name: 'Sales', category: 'Expertise' },
  { id: '5', name: 'Technical Support', category: 'Expertise' },
  { id: '6', name: 'Customer Service', category: 'Expertise' },
  { id: '7', name: 'Collections', category: 'Expertise' },
  { id: '8', name: 'Product Knowledge', category: 'Expertise' },
];

export function SkillAssignment({ assignments, onChange, disabled }: SkillAssignmentProps) {
  const [open, setOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');

  const addSkill = () => {
    if (selectedSkillId && !assignments.find(a => a.skillId === selectedSkillId)) {
      onChange([...assignments, { skillId: selectedSkillId, proficiency: 5 }]);
      setSelectedSkillId('');
      setOpen(false);
    }
  };

  const removeSkill = (skillId: string) => {
    onChange(assignments.filter(a => a.skillId !== skillId));
  };

  const updateProficiency = (skillId: string, proficiency: number) => {
    onChange(
      assignments.map(a =>
        a.skillId === skillId ? { ...a, proficiency } : a
      )
    );
  };

  const getSkillName = (skillId: string) => {
    return MOCK_SKILLS.find(s => s.id === skillId)?.name || 'Unknown';
  };

  const availableSkills = MOCK_SKILLS.filter(
    skill => !assignments.find(a => a.skillId === skill.id)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Skills & Proficiency</Label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled}>
              <Plus className="h-3 w-3 mr-1" />
              Add Skill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Skill</DialogTitle>
              <DialogDescription>
                Select a skill to add to this user
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Skill</Label>
                <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSkills.map((skill) => (
                      <SelectItem key={skill.id} value={skill.id}>
                        {skill.name} ({skill.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addSkill} disabled={!selectedSkillId}>
                  Add Skill
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skills assigned yet</p>
        ) : (
          assignments.map((assignment) => (
            <div
              key={assignment.skillId}
              className="rounded-lg border p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{getSkillName(assignment.skillId)}</p>
                  <p className="text-xs text-muted-foreground">
                    Proficiency: {assignment.proficiency}/10
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSkill(assignment.skillId)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Slider
                value={[assignment.proficiency]}
                onValueChange={([value]) => updateProficiency(assignment.skillId, value)}
                min={1}
                max={10}
                step={1}
                disabled={disabled}
                className="w-full"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
