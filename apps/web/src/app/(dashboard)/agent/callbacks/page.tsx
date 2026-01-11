'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Phone,
  Calendar,
  Clock,
  User,
  MapPin,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  PhoneCall,
  CalendarClock,
  StickyNote,
  Building,
} from 'lucide-react';

// Mock callbacks data
const mockCallbacks = [
  {
    id: '1',
    customer: { name: 'John Smith', phone: '+1 (555) 123-4567', company: 'Acme Corp', location: 'New York, NY' },
    scheduledDate: '2024-01-10',
    scheduledTime: '10:00',
    campaign: 'Sales Q1',
    priority: 'high',
    status: 'pending',
    notes: 'Interested in premium plan, needs pricing details',
    createdAt: '2024-01-08',
    attempts: 1,
  },
  {
    id: '2',
    customer: { name: 'Jane Doe', phone: '+1 (555) 234-5678', company: 'Tech Solutions', location: 'San Francisco, CA' },
    scheduledDate: '2024-01-10',
    scheduledTime: '11:30',
    campaign: 'Renewals',
    priority: 'medium',
    status: 'pending',
    notes: 'Contract renewal discussion, decision maker available',
    createdAt: '2024-01-09',
    attempts: 0,
  },
  {
    id: '3',
    customer: { name: 'Bob Wilson', phone: '+1 (555) 345-6789', company: 'Global Industries', location: 'Chicago, IL' },
    scheduledDate: '2024-01-10',
    scheduledTime: '14:00',
    campaign: 'Sales Q1',
    priority: 'low',
    status: 'pending',
    notes: 'Follow up on product demo, send brochure first',
    createdAt: '2024-01-07',
    attempts: 2,
  },
  {
    id: '4',
    customer: { name: 'Alice Brown', phone: '+1 (555) 456-7890', company: 'StartUp Inc', location: 'Austin, TX' },
    scheduledDate: '2024-01-11',
    scheduledTime: '09:00',
    campaign: 'New Leads',
    priority: 'high',
    status: 'pending',
    notes: 'Hot lead from webinar, very interested',
    createdAt: '2024-01-10',
    attempts: 0,
  },
  {
    id: '5',
    customer: { name: 'Charlie Davis', phone: '+1 (555) 567-8901', company: 'Enterprise LLC', location: 'Seattle, WA' },
    scheduledDate: '2024-01-09',
    scheduledTime: '16:00',
    campaign: 'Sales Q1',
    priority: 'medium',
    status: 'overdue',
    notes: 'Missed yesterday, try again today',
    createdAt: '2024-01-05',
    attempts: 3,
  },
];

export default function CallbacksPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isNewCallbackOpen, setIsNewCallbackOpen] = useState(false);
  const [selectedCallback, setSelectedCallback] = useState<typeof mockCallbacks[0] | null>(null);

  const filteredCallbacks = mockCallbacks.filter((callback) => {
    const matchesSearch =
      callback.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      callback.customer.phone.includes(searchTerm) ||
      callback.customer.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || callback.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || callback.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const todayCallbacks = mockCallbacks.filter(
    (cb) => cb.scheduledDate === '2024-01-10' && cb.status === 'pending'
  );
  const overdueCallbacks = mockCallbacks.filter((cb) => cb.status === 'overdue');
  const upcomingCallbacks = mockCallbacks.filter(
    (cb) => cb.scheduledDate > '2024-01-10' && cb.status === 'pending'
  );

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="default">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Overdue
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Callbacks</h1>
          <p className="text-muted-foreground">Manage your scheduled callback appointments</p>
        </div>
        <Button onClick={() => setIsNewCallbackOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Callback
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Callbacks</CardTitle>
            <CalendarClock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCallbacks.length}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCallbacks.length}</div>
            <p className="text-xs text-muted-foreground">Need immediate attention</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingCallbacks.length}</div>
            <p className="text-xs text-muted-foreground">Future scheduled</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">Successfully reached</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Callbacks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Callbacks</CardTitle>
          <CardDescription>
            {filteredCallbacks.length} callback{filteredCallbacks.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCallbacks.map((callback) => (
                <TableRow key={callback.id} className={callback.status === 'overdue' ? 'bg-red-50' : ''}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{callback.customer.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {callback.customer.phone}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {callback.customer.company}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{callback.scheduledDate}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{callback.scheduledTime}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{callback.campaign}</Badge>
                  </TableCell>
                  <TableCell>{getPriorityBadge(callback.priority)}</TableCell>
                  <TableCell>{getStatusBadge(callback.status)}</TableCell>
                  <TableCell>
                    <span className={callback.attempts >= 3 ? 'text-red-600 font-medium' : ''}>
                      {callback.attempts}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="text-sm text-muted-foreground truncate" title={callback.notes}>
                      {callback.notes}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => console.log('Calling:', callback.customer.phone)}
                      >
                        <PhoneCall className="h-4 w-4" />
                        Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCallback(callback)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Callback Dialog */}
      <Dialog open={isNewCallbackOpen} onOpenChange={setIsNewCallbackOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Schedule New Callback
            </DialogTitle>
            <DialogDescription>
              Create a new callback appointment with a customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Customer Name</Label>
                <Input id="customer-name" placeholder="Enter name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" placeholder="+1 (555) 000-0000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input id="time" type="time" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campaign">Campaign</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales-q1">Sales Q1</SelectItem>
                    <SelectItem value="renewals">Renewals</SelectItem>
                    <SelectItem value="new-leads">New Leads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Add notes about this callback..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewCallbackOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsNewCallbackOpen(false)}>
              <CalendarClock className="h-4 w-4 mr-2" />
              Schedule Callback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Callback Dialog */}
      <Dialog open={!!selectedCallback} onOpenChange={() => setSelectedCallback(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Callback
            </DialogTitle>
            <DialogDescription>
              Update callback details for {selectedCallback?.customer.name}
            </DialogDescription>
          </DialogHeader>
          {selectedCallback && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedCallback.customer.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedCallback.customer.phone}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input id="edit-date" type="date" defaultValue={selectedCallback.scheduledDate} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-time">Time</Label>
                  <Input id="edit-time" type="time" defaultValue={selectedCallback.scheduledTime} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select defaultValue={selectedCallback.priority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea id="edit-notes" defaultValue={selectedCallback.notes} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCallback(null)}>
              Cancel
            </Button>
            <Button onClick={() => setSelectedCallback(null)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
