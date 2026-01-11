'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Phone, Loader2 } from 'lucide-react';
import type { UserRole } from '@nexusdialer/types';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    tenantSlug: '',
  });

  // Mock users for UI testing (remove in production)
  const mockUsers: Record<string, { password: string; user: Parameters<typeof setUser>[0] }> = {
    'admin@nexus.com': {
      password: 'admin123',
      user: {
        id: '1',
        email: 'admin@nexus.com',
        firstName: 'Alex',
        lastName: 'Admin',
        role: 'admin',
        tenant: { id: '1', name: 'NexusDialer Demo', slug: 'nexus-demo' },
      },
    },
    'supervisor@nexus.com': {
      password: 'super123',
      user: {
        id: '2',
        email: 'supervisor@nexus.com',
        firstName: 'Sarah',
        lastName: 'Supervisor',
        role: 'supervisor',
        tenant: { id: '1', name: 'NexusDialer Demo', slug: 'nexus-demo' },
      },
    },
    'agent@nexus.com': {
      password: 'agent123',
      user: {
        id: '3',
        email: 'agent@nexus.com',
        firstName: 'Andy',
        lastName: 'Agent',
        role: 'agent',
        tenant: { id: '1', name: 'NexusDialer Demo', slug: 'nexus-demo' },
      },
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      // Mock authentication for UI testing
      const mockUser = mockUsers[formData.email];
      if (mockUser && mockUser.password === formData.password) {
        setUser(mockUser.user, 'mock-jwt-token');

        toast({
          title: 'Welcome back!',
          description: `Logged in as ${mockUser.user.firstName}`,
        });

        // Redirect based on role
        const role = mockUser.user.role;
        if (role === 'admin') {
          router.push('/admin');
        } else if (role === 'supervisor') {
          router.push('/supervisor');
        } else {
          router.push('/agent');
        }
        return;
      }

      // Fall back to real API if not a mock user
      const result = await authApi.login(
        formData.email,
        formData.password,
        formData.tenantSlug || undefined
      );

      if (result.success && result.data) {
        setUser(
          {
            id: result.data.user.id,
            email: result.data.user.email,
            firstName: result.data.user.firstName,
            lastName: result.data.user.lastName,
            role: result.data.user.role as UserRole,
            tenant: result.data.user.tenant,
          },
          result.data.token
        );

        toast({
          title: 'Welcome back!',
          description: `Logged in as ${result.data.user.firstName}`,
        });

        // Redirect based on role
        const role = result.data.user.role;
        if (role === 'admin') {
          router.push('/admin');
        } else if (role === 'supervisor') {
          router.push('/supervisor');
        } else {
          router.push('/agent');
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: result.error?.message || 'Invalid credentials',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: 'Invalid email or password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Phone className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">NexusDialer</CardTitle>
          <CardDescription>
            Sign in to your contact center account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Organization (optional)</Label>
              <Input
                id="tenantSlug"
                placeholder="your-company"
                value={formData.tenantSlug}
                onChange={(e) =>
                  setFormData({ ...formData, tenantSlug: e.target.value })
                }
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="agent@company.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
