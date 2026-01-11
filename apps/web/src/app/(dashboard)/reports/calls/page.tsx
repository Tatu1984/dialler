'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '../components/date-range-picker';
import { DataTable, Column } from '../components/data-table';
import { Play, Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface CallRecord {
  id: string;
  dateTime: string;
  agent: string;
  customer: string;
  phoneNumber: string;
  duration: string;
  disposition: string;
  campaign: string;
  direction: 'inbound' | 'outbound';
  hasRecording: boolean;
}

// Mock data
const mockCallData: CallRecord[] = [
  {
    id: 'CALL-001',
    dateTime: '2026-01-10 09:15:23',
    agent: 'Sarah Johnson',
    customer: 'John Smith',
    phoneNumber: '+1 (555) 123-4567',
    duration: '5:32',
    disposition: 'Converted',
    campaign: 'Q1 Sales Push',
    direction: 'outbound',
    hasRecording: true,
  },
  {
    id: 'CALL-002',
    dateTime: '2026-01-10 09:22:45',
    agent: 'Mike Chen',
    customer: 'Emily Davis',
    phoneNumber: '+1 (555) 234-5678',
    duration: '3:18',
    disposition: 'Follow-up',
    campaign: 'Customer Support',
    direction: 'inbound',
    hasRecording: true,
  },
  {
    id: 'CALL-003',
    dateTime: '2026-01-10 09:35:12',
    agent: 'Sarah Johnson',
    customer: 'Robert Wilson',
    phoneNumber: '+1 (555) 345-6789',
    duration: '7:45',
    disposition: 'Not Interested',
    campaign: 'Q1 Sales Push',
    direction: 'outbound',
    hasRecording: true,
  },
  {
    id: 'CALL-004',
    dateTime: '2026-01-10 09:48:30',
    agent: 'Lisa Anderson',
    customer: 'Michael Brown',
    phoneNumber: '+1 (555) 456-7890',
    duration: '2:15',
    disposition: 'No Answer',
    campaign: 'Cold Outreach',
    direction: 'outbound',
    hasRecording: false,
  },
  {
    id: 'CALL-005',
    dateTime: '2026-01-10 10:02:18',
    agent: 'Mike Chen',
    customer: 'Jennifer Garcia',
    phoneNumber: '+1 (555) 567-8901',
    duration: '6:22',
    disposition: 'Converted',
    campaign: 'Renewal Campaign',
    direction: 'outbound',
    hasRecording: true,
  },
  {
    id: 'CALL-006',
    dateTime: '2026-01-10 10:15:40',
    agent: 'Tom Martinez',
    customer: 'David Lee',
    phoneNumber: '+1 (555) 678-9012',
    duration: '4:50',
    disposition: 'Callback Scheduled',
    campaign: 'Q1 Sales Push',
    direction: 'outbound',
    hasRecording: true,
  },
  {
    id: 'CALL-007',
    dateTime: '2026-01-10 10:28:55',
    agent: 'Sarah Johnson',
    customer: 'Amanda White',
    phoneNumber: '+1 (555) 789-0123',
    duration: '8:12',
    disposition: 'Converted',
    campaign: 'Q1 Sales Push',
    direction: 'outbound',
    hasRecording: true,
  },
  {
    id: 'CALL-008',
    dateTime: '2026-01-10 10:42:33',
    agent: 'Lisa Anderson',
    customer: 'Christopher Taylor',
    phoneNumber: '+1 (555) 890-1234',
    duration: '1:45',
    disposition: 'Wrong Number',
    campaign: 'Cold Outreach',
    direction: 'outbound',
    hasRecording: false,
  },
];

const getDispositionVariant = (disposition: string) => {
  switch (disposition) {
    case 'Converted':
      return 'success';
    case 'Follow-up':
    case 'Callback Scheduled':
      return 'info';
    case 'Not Interested':
    case 'Wrong Number':
      return 'destructive';
    case 'No Answer':
      return 'warning';
    default:
      return 'default';
  }
};

export default function CallsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedDisposition, setSelectedDisposition] = useState<string>('all');

  const columns: Column<CallRecord>[] = [
    {
      key: 'dateTime',
      header: 'Date/Time',
      accessor: (row) => (
        <div className="text-sm">
          <div className="font-medium">
            {new Date(row.dateTime).toLocaleDateString()}
          </div>
          <div className="text-muted-foreground">
            {new Date(row.dateTime).toLocaleTimeString()}
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'agent',
      header: 'Agent',
      accessor: (row) => <span className="font-medium">{row.agent}</span>,
      sortable: true,
    },
    {
      key: 'customer',
      header: 'Customer',
      accessor: (row) => (
        <div className="text-sm">
          <div className="font-medium">{row.customer}</div>
          <div className="text-muted-foreground">{row.phoneNumber}</div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'duration',
      header: 'Duration',
      accessor: (row) => <span className="font-mono text-sm">{row.duration}</span>,
      sortable: true,
    },
    {
      key: 'disposition',
      header: 'Disposition',
      accessor: (row) => (
        <Badge variant={getDispositionVariant(row.disposition) as any}>
          {row.disposition}
        </Badge>
      ),
      sortable: true,
    },
    {
      key: 'campaign',
      header: 'Campaign',
      accessor: (row) => <span className="text-sm">{row.campaign}</span>,
      sortable: true,
    },
    {
      key: 'direction',
      header: 'Direction',
      accessor: (row) => (
        <Badge variant={row.direction === 'inbound' ? 'info' : 'default'}>
          {row.direction}
        </Badge>
      ),
      sortable: true,
    },
    {
      key: 'recording',
      header: 'Recording',
      accessor: (row) => (
        <Button
          variant="ghost"
          size="sm"
          disabled={!row.hasRecording}
          className="h-8 w-8 p-0"
        >
          <Play className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const handleExport = () => {
    console.log('Exporting call records...');
    // Implement CSV/Excel export
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Call Detail Records
            </h1>
            <p className="text-muted-foreground mt-1">
              Detailed call history and recordings
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <DateRangePicker />
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger>
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="sarah">Sarah Johnson</SelectItem>
                <SelectItem value="mike">Mike Chen</SelectItem>
                <SelectItem value="lisa">Lisa Anderson</SelectItem>
                <SelectItem value="tom">Tom Martinez</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger>
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                <SelectItem value="q1sales">Q1 Sales Push</SelectItem>
                <SelectItem value="support">Customer Support</SelectItem>
                <SelectItem value="cold">Cold Outreach</SelectItem>
                <SelectItem value="renewal">Renewal Campaign</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={selectedDisposition}
              onValueChange={setSelectedDisposition}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select disposition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dispositions</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="followup">Follow-up</SelectItem>
                <SelectItem value="notinterested">Not Interested</SelectItem>
                <SelectItem value="noanswer">No Answer</SelectItem>
                <SelectItem value="callback">Callback Scheduled</SelectItem>
                <SelectItem value="wrong">Wrong Number</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Call Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Call Records</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={mockCallData}
            columns={columns}
            searchable
            searchPlaceholder="Search calls..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
