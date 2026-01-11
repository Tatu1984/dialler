'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserForm, UserFormData } from '../../components/user-form';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  Shield,
  Activity,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface UserDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Mock user data
const getMockUser = (id: string): {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'AGENT';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLogin: string;
  teams: string[];
  skills: Array<{ skillId: string; proficiency: number }>;
  agentId: string;
  maxConcurrentCalls: number;
  autoAnswer: boolean;
  createdAt: string;
  updatedAt: string;
} => ({
  id,
  firstName: 'Sarah',
  lastName: 'Smith',
  email: 'sarah.smith@nexusdial.com',
  phone: '+1 (555) 234-5678',
  role: 'SUPERVISOR',
  status: 'ACTIVE',
  lastLogin: '5 minutes ago',
  teams: ['1', '2'],
  skills: [
    { skillId: '1', proficiency: 9 },
    { skillId: '4', proficiency: 8 },
    { skillId: '6', proficiency: 7 },
  ],
  agentId: 'SUP-002',
  maxConcurrentCalls: 3,
  autoAnswer: true,
  createdAt: '2024-02-20',
  updatedAt: '2024-03-25',
});

// Mock activity log
const MOCK_ACTIVITY = [
  {
    id: '1',
    action: 'Login',
    description: 'User logged in from Chrome on Windows',
    timestamp: '2 hours ago',
    icon: Activity,
  },
  {
    id: '2',
    action: 'Profile Updated',
    description: 'Phone number changed',
    timestamp: '1 day ago',
    icon: Edit,
  },
  {
    id: '3',
    action: 'Role Changed',
    description: 'Promoted to Supervisor',
    timestamp: '3 days ago',
    icon: Shield,
  },
  {
    id: '4',
    action: 'Team Assigned',
    description: 'Added to Sales Team',
    timestamp: '5 days ago',
    icon: Activity,
  },
  {
    id: '5',
    action: 'Account Created',
    description: 'User account created by admin',
    timestamp: '1 month ago',
    icon: Activity,
  },
];

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [user] = useState(getMockUser(id));
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleUpdateUser = (data: UserFormData) => {
    // Simulate API call
    console.log('Updating user:', data);
    setIsEditing(false);
    toast({
      title: 'User updated',
      description: 'User information has been saved successfully.',
    });
  };

  const handleDeleteUser = () => {
    // Simulate API call
    toast({
      title: 'User deleted',
      description: 'User has been removed successfully.',
    });
    router.push('/admin/users');
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'SUPERVISOR':
        return 'default';
      case 'AGENT':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">User Details</h1>
            <p className="text-muted-foreground">
              View and manage user information
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src="" />
              <AvatarFallback className="text-2xl">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">
                    {user.firstName} {user.lastName}
                  </h2>
                  <Badge variant={getRoleBadgeVariant(user.role) as any}>
                    {user.role}
                  </Badge>
                  <Badge variant={user.status === 'ACTIVE' ? 'success' : 'outline'}>
                    {user.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  User ID: {user.id}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{user.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Joined {user.createdAt}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Last login: {user.lastLogin}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Basic user information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>First Name</Label>
                  <p className="text-sm mt-1">{user.firstName}</p>
                </div>
                <div>
                  <Label>Last Name</Label>
                  <p className="text-sm mt-1">{user.lastName}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm mt-1">{user.email}</p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <p className="text-sm mt-1">{user.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {user.role === 'AGENT' && (
            <Card>
              <CardHeader>
                <CardTitle>Agent Settings</CardTitle>
                <CardDescription>
                  Agent-specific configuration and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label>Agent ID</Label>
                    <p className="text-sm mt-1">{user.agentId}</p>
                  </div>
                  <div>
                    <Label>Max Concurrent Calls</Label>
                    <p className="text-sm mt-1">{user.maxConcurrentCalls}</p>
                  </div>
                  <div>
                    <Label>Auto Answer</Label>
                    <p className="text-sm mt-1">
                      {user.autoAnswer ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Skills</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.skills.map((skill) => (
                      <Badge key={skill.skillId} variant="secondary">
                        Skill {skill.skillId} - Level {skill.proficiency}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role & Permissions</CardTitle>
              <CardDescription>
                User role and access permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Role</Label>
                <div className="mt-2">
                  <Badge variant={getRoleBadgeVariant(user.role) as any} className="text-sm px-3 py-1">
                    {user.role}
                  </Badge>
                </div>
              </div>

              <div>
                <Label>Teams</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {user.teams.map((teamId) => (
                    <Badge key={teamId} variant="outline">
                      Team {teamId}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="mt-2 space-y-2">
                  <PermissionItem
                    label="View Dashboard"
                    granted={true}
                  />
                  <PermissionItem
                    label="Manage Users"
                    granted={user.role === 'ADMIN' || user.role === 'SUPERVISOR'}
                  />
                  <PermissionItem
                    label="Manage Campaigns"
                    granted={user.role === 'ADMIN' || user.role === 'SUPERVISOR'}
                  />
                  <PermissionItem
                    label="System Settings"
                    granted={user.role === 'ADMIN'}
                  />
                  <PermissionItem
                    label="View Reports"
                    granted={true}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                Recent user actions and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_ACTIVITY.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <activity.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {activity.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings
            </DialogDescription>
          </DialogHeader>
          <UserForm
            mode="edit"
            initialData={{
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phone: user.phone,
              role: user.role,
              teams: user.teams,
              isActive: user.status === 'ACTIVE',
              skills: user.skills,
              agentId: user.agentId,
              maxConcurrentCalls: user.maxConcurrentCalls,
              autoAnswer: user.autoAnswer,
            }}
            onSubmit={handleUpdateUser}
            onCancel={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser}>
                Delete User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component for permission items
function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium">{children}</label>;
}

function PermissionItem({ label, granted }: { label: string; granted: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg border">
      <span className="text-sm">{label}</span>
      <Badge variant={granted ? 'success' : 'outline'}>
        {granted ? 'Granted' : 'Denied'}
      </Badge>
    </div>
  );
}
