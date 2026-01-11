'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RoleSelector, UserRole } from './role-selector';
import { TeamSelector } from './team-selector';
import { SkillAssignment, SkillAssignment as SkillAssignmentType } from './skill-assignment';

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  teams: string[];
  skills: SkillAssignmentType[];
  isActive: boolean;
  // Agent-specific fields
  agentId?: string;
  maxConcurrentCalls?: number;
  autoAnswer?: boolean;
}

interface UserFormProps {
  initialData?: Partial<UserFormData>;
  onSubmit: (data: UserFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export function UserForm({ initialData, onSubmit, onCancel, isLoading, mode }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    role: initialData?.role || 'AGENT',
    teams: initialData?.teams || [],
    skills: initialData?.skills || [],
    isActive: initialData?.isActive ?? true,
    agentId: initialData?.agentId || '',
    maxConcurrentCalls: initialData?.maxConcurrentCalls || 1,
    autoAnswer: initialData?.autoAnswer ?? false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof UserFormData, string>> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const updateField = <K extends keyof UserFormData>(field: K, value: UserFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isAgent = formData.role === 'AGENT';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              placeholder="John"
              disabled={isLoading}
            />
            {errors.firstName && (
              <p className="text-sm text-red-500">{errors.firstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">
              Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              placeholder="Doe"
              disabled={isLoading}
            />
            {errors.lastName && (
              <p className="text-sm text-red-500">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="john.doe@company.com"
            disabled={isLoading || mode === 'edit'}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
            disabled={isLoading}
          />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => updateField('isActive', checked)}
            disabled={isLoading}
          />
          <Label htmlFor="isActive">Active Account</Label>
        </div>
      </div>

      {/* Role & Permissions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Role & Permissions</h3>

        <RoleSelector
          value={formData.role}
          onChange={(role) => updateField('role', role)}
          disabled={isLoading}
        />

        <TeamSelector
          selectedTeams={formData.teams}
          onChange={(teams) => updateField('teams', teams)}
          disabled={isLoading}
        />
      </div>

      {/* Agent-Specific Settings */}
      {isAgent && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Agent Settings</h3>

          <div className="space-y-2">
            <Label htmlFor="agentId">Agent ID</Label>
            <Input
              id="agentId"
              value={formData.agentId}
              onChange={(e) => updateField('agentId', e.target.value)}
              placeholder="AGT-001"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxConcurrentCalls">Max Concurrent Calls</Label>
            <Input
              id="maxConcurrentCalls"
              type="number"
              min="1"
              max="10"
              value={formData.maxConcurrentCalls}
              onChange={(e) => updateField('maxConcurrentCalls', parseInt(e.target.value))}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="autoAnswer"
              checked={formData.autoAnswer}
              onCheckedChange={(checked) => updateField('autoAnswer', checked)}
              disabled={isLoading}
            />
            <Label htmlFor="autoAnswer">Auto-answer calls</Label>
          </div>

          <SkillAssignment
            assignments={formData.skills}
            onChange={(skills) => updateField('skills', skills)}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
