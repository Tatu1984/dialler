'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Megaphone,
  Phone,
  Server,
  Activity,
  TrendingUp,
  Settings,
  FileText,
  Plus,
  ArrowUpRight,
  Shield,
  UsersRound,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            System overview for {user?.tenant.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button asChild>
            <Link href="/admin/users">
              <Plus className="h-4 w-4 mr-2" />
              New User
            </Link>
          </Button>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+12</span> this month
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              45 Agents, 8 Supervisors, 3 Admins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">3 outbound, 5 inbound</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+18%</span> vs yesterday
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Healthy</div>
            <p className="text-xs text-muted-foreground">All services operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Activity */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
            <CardDescription>Recent user actions and logins</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { event: 'New user registered', user: 'john.doe@company.com', time: '2 min ago', icon: Users },
                { event: 'Role changed', user: 'sarah.smith@company.com to Supervisor', time: '15 min ago', icon: Shield },
                { event: 'Team created', user: 'Sales Team - 12 members', time: '1 hour ago', icon: UsersRound },
                { event: 'Skill assigned', user: 'Spanish proficiency to 5 agents', time: '2 hours ago', icon: Activity },
                { event: 'User deactivated', user: 'michael.jones@company.com', time: '4 hours ago', icon: Users },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <activity.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.event}</p>
                    <p className="text-xs text-muted-foreground">{activity.user}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Activity */}
        <Card>
          <CardHeader>
            <CardTitle>System Activity</CardTitle>
            <CardDescription>Recent system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { event: 'Campaign started', user: 'Q4 Collections', time: '15 min ago', icon: Megaphone },
                { event: 'Settings updated', user: 'IVR Flow: Main Menu', time: '1 hour ago', icon: Settings },
                { event: 'Lead list imported', user: '2,500 leads added', time: '2 hours ago', icon: FileText },
                { event: 'System backup completed', user: 'Database snapshot', time: '4 hours ago', icon: Server },
                { event: 'Integration enabled', user: 'Salesforce CRM sync', time: '6 hours ago', icon: Activity },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <activity.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.event}</p>
                    <p className="text-xs text-muted-foreground">{activity.user}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { title: 'Manage Users', description: 'Add, edit, or remove users', icon: Users, href: '/admin/users' },
              { title: 'Manage Teams', description: 'Organize users into teams', icon: UsersRound, href: '/admin/teams' },
              { title: 'Manage Skills', description: 'Define and assign skills', icon: Activity, href: '/admin/skills' },
              { title: 'System Settings', description: 'Configure tenant settings', icon: Settings, href: '/admin/settings' },
            ].map((action) => (
              <Link key={action.title} href={action.href}>
                <div className="group relative rounded-lg border p-4 hover:border-primary hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{action.title}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
