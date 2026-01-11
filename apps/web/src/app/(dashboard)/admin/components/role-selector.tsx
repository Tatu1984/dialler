'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'AGENT' | 'READONLY';

interface RoleSelectorProps {
  value: UserRole;
  onChange: (value: UserRole) => void;
  disabled?: boolean;
}

const ROLES = [
  { value: 'ADMIN' as const, label: 'Admin', description: 'Full system access' },
  { value: 'SUPERVISOR' as const, label: 'Supervisor', description: 'Manage agents and campaigns' },
  { value: 'AGENT' as const, label: 'Agent', description: 'Handle calls and leads' },
  { value: 'READONLY' as const, label: 'Read Only', description: 'View-only access' },
];

export function RoleSelector({ value, onChange, disabled }: RoleSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Role</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((role) => (
            <SelectItem key={role.value} value={role.value}>
              <div className="flex flex-col">
                <span className="font-medium">{role.label}</span>
                <span className="text-xs text-muted-foreground">{role.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
