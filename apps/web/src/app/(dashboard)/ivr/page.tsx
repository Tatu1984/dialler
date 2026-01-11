'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Search,
  Phone,
  Edit,
  Copy,
  Trash2,
  Play,
  Pause,
  GitBranch,
} from 'lucide-react';

export default function IVRPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock IVR data
  const ivrMenus = [
    {
      id: '1',
      name: 'Main Menu',
      description: 'Primary customer service menu',
      status: 'active',
      phoneNumbers: ['+1-800-555-0100', '+1-800-555-0101'],
      nodes: 8,
      lastModified: '2024-01-10',
      calls24h: 1243,
    },
    {
      id: '2',
      name: 'Sales IVR',
      description: 'Sales department routing',
      status: 'active',
      phoneNumbers: ['+1-800-555-0200'],
      nodes: 5,
      lastModified: '2024-01-09',
      calls24h: 456,
    },
    {
      id: '3',
      name: 'After Hours Menu',
      description: 'Off-hours call handling',
      status: 'active',
      phoneNumbers: ['+1-800-555-0100'],
      nodes: 3,
      lastModified: '2024-01-08',
      calls24h: 89,
    },
    {
      id: '4',
      name: 'Technical Support',
      description: 'Technical support routing',
      status: 'active',
      phoneNumbers: ['+1-800-555-0300'],
      nodes: 12,
      lastModified: '2024-01-05',
      calls24h: 234,
    },
    {
      id: '5',
      name: 'VIP Customer Line',
      description: 'Priority customer routing',
      status: 'active',
      phoneNumbers: ['+1-800-555-0500'],
      nodes: 4,
      lastModified: '2024-01-03',
      calls24h: 67,
    },
    {
      id: '6',
      name: 'Legacy Menu (Deprecated)',
      description: 'Old menu - being phased out',
      status: 'inactive',
      phoneNumbers: [],
      nodes: 15,
      lastModified: '2023-12-20',
      calls24h: 0,
    },
  ];

  const filteredMenus = ivrMenus.filter(
    menu =>
      menu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      menu.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCalls = ivrMenus.reduce((sum, menu) => sum + menu.calls24h, 0);
  const activeMenus = ivrMenus.filter(menu => menu.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">IVR Management</h1>
          <p className="text-muted-foreground">
            Design and manage interactive voice response menus
          </p>
        </div>
        <Link href="/ivr/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create IVR Menu
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total IVR Menus</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ivrMenus.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeMenus} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all IVR menus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-green-500">
              +3% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Phone Numbers</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(ivrMenus.flatMap(m => m.phoneNumbers)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique numbers in use
            </p>
          </CardContent>
        </Card>
      </div>

      {/* IVR List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>IVR Menus</CardTitle>
              <CardDescription>
                {filteredMenus.length} menu{filteredMenus.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search IVR menus..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Phone Numbers</TableHead>
                    <TableHead className="text-center">Nodes</TableHead>
                    <TableHead className="text-right">Calls (24h)</TableHead>
                    <TableHead>Last Modified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMenus.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <GitBranch className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No IVR menus found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMenus.map(menu => (
                      <TableRow key={menu.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{menu.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {menu.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={menu.status === 'active' ? 'success' : 'outline'}>
                            {menu.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {menu.phoneNumbers.length > 0 ? (
                            <div className="space-y-1">
                              {menu.phoneNumbers.slice(0, 2).map(number => (
                                <div key={number} className="text-sm">
                                  {number}
                                </div>
                              ))}
                              {menu.phoneNumbers.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{menu.phoneNumbers.length - 2} more
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{menu.nodes}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {menu.calls24h.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(menu.lastModified).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/ivr/${menu.id}`}>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="icon">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              {menu.status === 'active' ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
