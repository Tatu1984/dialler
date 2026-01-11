'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Phone,
  LayoutDashboard,
  Users,
  Megaphone,
  FileText,
  Settings,
  BarChart3,
  Headphones,
  Building2,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  ListChecks,
  Mic,
  Bot,
  Workflow,
} from 'lucide-react';
import type { UserRole } from '@nexusdialer/types';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  // Agent items
  {
    title: 'Dashboard',
    href: '/agent',
    icon: LayoutDashboard,
    roles: ['agent'],
  },
  {
    title: 'Active Call',
    href: '/agent/call',
    icon: PhoneCall,
    roles: ['agent'],
  },
  {
    title: 'Callbacks',
    href: '/agent/callbacks',
    icon: ListChecks,
    roles: ['agent'],
  },

  // Supervisor items
  {
    title: 'Dashboard',
    href: '/supervisor',
    icon: LayoutDashboard,
    roles: ['supervisor'],
  },
  {
    title: 'Agents',
    href: '/supervisor/agents',
    icon: Headphones,
    roles: ['supervisor'],
  },
  {
    title: 'Queues',
    href: '/supervisor/queues',
    icon: Users,
    roles: ['supervisor'],
  },
  {
    title: 'Wallboard',
    href: '/supervisor/wallboard',
    icon: BarChart3,
    roles: ['supervisor'],
  },
  {
    title: 'Campaigns',
    href: '/campaigns',
    icon: Megaphone,
    roles: ['supervisor'],
  },
  {
    title: 'Leads',
    href: '/leads',
    icon: FileText,
    roles: ['supervisor'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['supervisor'],
  },
  {
    title: 'Recordings',
    href: '/supervisor/recordings',
    icon: Mic,
    roles: ['supervisor'],
  },

  // Admin items
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    roles: ['admin'],
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    title: 'Teams',
    href: '/admin/teams',
    icon: Users,
    roles: ['admin'],
  },
  {
    title: 'Campaigns',
    href: '/campaigns',
    icon: Megaphone,
    roles: ['admin'],
  },
  {
    title: 'Leads',
    href: '/leads',
    icon: FileText,
    roles: ['admin'],
  },
  {
    title: 'Queues',
    href: '/queues',
    icon: PhoneCall,
    roles: ['admin'],
  },
  {
    title: 'IVR Builder',
    href: '/ivr',
    icon: Workflow,
    roles: ['admin'],
  },
  {
    title: 'DNC Lists',
    href: '/dnc',
    icon: ListChecks,
    roles: ['admin'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['admin'],
  },
  {
    title: 'AI Settings',
    href: '/admin/ai',
    icon: Bot,
    roles: ['admin'],
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Building2,
    roles: ['admin'],
  },
  {
    title: 'System',
    href: '/admin/system',
    icon: Settings,
    roles: ['admin'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const userRole = user?.role || 'agent';
  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Phone className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">NexusDialer</span>
          </Link>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary mx-auto">
            <Phone className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.title : undefined}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>

      {/* User Info */}
      {!collapsed && user && (
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {user.role}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
