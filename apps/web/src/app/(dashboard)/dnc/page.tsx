'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Plus,
  Search,
  Upload,
  Download,
  Trash2,
  Shield,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface DNCEntry {
  id: string;
  phoneNumber: string;
  addedDate: string;
  addedBy: string;
  reason: string;
  source: 'manual' | 'import' | 'automatic';
  status: 'active' | 'expired';
}

export default function DNCPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newReason, setNewReason] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Mock DNC data
  const [dncEntries, setDncEntries] = useState<DNCEntry[]>([
    {
      id: '1',
      phoneNumber: '+1-555-0100',
      addedDate: '2024-01-10',
      addedBy: 'admin@company.com',
      reason: 'Customer request',
      source: 'manual',
      status: 'active',
    },
    {
      id: '2',
      phoneNumber: '+1-555-0101',
      addedDate: '2024-01-09',
      addedBy: 'system',
      reason: 'Automatic - Multiple opt-outs',
      source: 'automatic',
      status: 'active',
    },
    {
      id: '3',
      phoneNumber: '+1-555-0102',
      addedDate: '2024-01-08',
      addedBy: 'admin@company.com',
      reason: 'Complaint filed',
      source: 'manual',
      status: 'active',
    },
    {
      id: '4',
      phoneNumber: '+1-555-0103',
      addedDate: '2024-01-05',
      addedBy: 'bulk-import.csv',
      reason: 'Bulk import - Compliance list',
      source: 'import',
      status: 'active',
    },
    {
      id: '5',
      phoneNumber: '+1-555-0104',
      addedDate: '2024-01-03',
      addedBy: 'system',
      reason: 'Invalid number',
      source: 'automatic',
      status: 'active',
    },
    {
      id: '6',
      phoneNumber: '+1-555-0105',
      addedDate: '2023-12-20',
      addedBy: 'admin@company.com',
      reason: 'Temporary block - Expired',
      source: 'manual',
      status: 'expired',
    },
  ]);

  const filteredEntries = dncEntries.filter(entry => {
    const matchesSearch = entry.phoneNumber.includes(searchTerm) ||
                         entry.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = filterSource === 'all' || entry.source === filterSource;
    return matchesSearch && matchesSource;
  });

  const handleAddNumber = () => {
    if (!newPhoneNumber.trim()) return;

    const newEntry: DNCEntry = {
      id: `dnc-${Date.now()}`,
      phoneNumber: newPhoneNumber,
      addedDate: new Date().toISOString().split('T')[0],
      addedBy: 'current-user@company.com',
      reason: newReason || 'Manually added',
      source: 'manual',
      status: 'active',
    };

    setDncEntries([newEntry, ...dncEntries]);
    setNewPhoneNumber('');
    setNewReason('');
    setIsAddDialogOpen(false);
  };

  const handleRemoveNumber = (id: string) => {
    setDncEntries(dncEntries.filter(entry => entry.id !== id));
  };

  const handleExport = () => {
    console.log('Exporting DNC list');
    // TODO: Implement export functionality
  };

  const activeCount = dncEntries.filter(e => e.status === 'active').length;
  const manualCount = dncEntries.filter(e => e.source === 'manual').length;
  const automaticCount = dncEntries.filter(e => e.source === 'automatic').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Do Not Call (DNC) Management</h1>
          <p className="text-muted-foreground">
            Manage your DNC list to ensure compliance with regulations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Import DNC Numbers</DialogTitle>
                <DialogDescription>
                  Upload a CSV file containing phone numbers to add to the DNC list
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">CSV File</Label>
                  <Input id="file" type="file" accept=".csv" />
                  <p className="text-xs text-muted-foreground">
                    Format: phoneNumber, reason (one per line)
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Example CSV format:</strong><br />
                    +1-555-0100,Customer request<br />
                    +1-555-0101,Complaint filed
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBulkImportOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsBulkImportOpen(false)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Number
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Phone Number to DNC List</DialogTitle>
                <DialogDescription>
                  Enter the phone number you want to add to the Do Not Call list
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="+1-555-0100"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Input
                    id="reason"
                    placeholder="e.g., Customer request"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddNumber}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to DNC
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dncEntries.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeCount} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Manual Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{manualCount}</div>
            <p className="text-xs text-muted-foreground">
              Added manually
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Automatic Entries</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{automaticCount}</div>
            <p className="text-xs text-muted-foreground">
              System generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Calls Blocked</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">847</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Info */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-blue-900 dark:text-blue-100">
              Compliance Information
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 dark:text-blue-100 space-y-2">
          <p>
            <strong>Telephone Consumer Protection Act (TCPA):</strong> This list helps ensure
            compliance with federal regulations prohibiting calls to numbers on the National
            Do Not Call Registry.
          </p>
          <p>
            <strong>Best Practices:</strong> Numbers added to this list will be automatically
            excluded from all outbound campaigns. Review and update this list regularly.
          </p>
          <p>
            <strong>Retention:</strong> DNC entries are retained for a minimum of 5 years as
            required by law.
          </p>
        </CardContent>
      </Card>

      {/* DNC List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>DNC Entries</CardTitle>
              <CardDescription>
                {filteredEntries.length} entr{filteredEntries.length !== 1 ? 'ies' : 'y'} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by phone number or reason..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="import">Import</SelectItem>
                  <SelectItem value="automatic">Automatic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Shield className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No DNC entries found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono font-medium">
                          {entry.phoneNumber}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.source === 'manual'
                                ? 'default'
                                : entry.source === 'automatic'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {entry.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {entry.reason}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {entry.addedBy}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(entry.addedDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.status === 'active' ? 'success' : 'outline'}>
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveNumber(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination placeholder */}
            {filteredEntries.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredEntries.length} of {dncEntries.length} entries
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
