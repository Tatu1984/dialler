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
import { ChartWidget, PieChart, LineChart } from '../components/chart-widget';
import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';

interface CampaignReport {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  totalDials: number;
  connected: number;
  connectRate: number;
  converted: number;
  conversionRate: number;
  penetrationRate: number;
  avgCallDuration: string;
  leadsRemaining: number;
}

// Mock data
const mockCampaignData: CampaignReport[] = [
  {
    id: 'CMP-001',
    name: 'Q1 Sales Push',
    status: 'active',
    totalDials: 1247,
    connected: 856,
    connectRate: 68.6,
    converted: 245,
    conversionRate: 28.6,
    penetrationRate: 42.3,
    avgCallDuration: '5:18',
    leadsRemaining: 1823,
  },
  {
    id: 'CMP-002',
    name: 'Renewal Campaign',
    status: 'active',
    totalDials: 892,
    connected: 723,
    connectRate: 81.1,
    converted: 312,
    conversionRate: 43.2,
    penetrationRate: 67.8,
    avgCallDuration: '6:42',
    leadsRemaining: 423,
  },
  {
    id: 'CMP-003',
    name: 'Cold Outreach',
    status: 'active',
    totalDials: 2134,
    connected: 1245,
    connectRate: 58.3,
    converted: 187,
    conversionRate: 15.0,
    penetrationRate: 31.2,
    avgCallDuration: '3:45',
    leadsRemaining: 4523,
  },
  {
    id: 'CMP-004',
    name: 'Customer Support',
    status: 'active',
    totalDials: 567,
    connected: 523,
    connectRate: 92.2,
    converted: 445,
    conversionRate: 85.1,
    penetrationRate: 89.4,
    avgCallDuration: '7:23',
    leadsRemaining: 67,
  },
  {
    id: 'CMP-005',
    name: 'Holiday Promotion',
    status: 'completed',
    totalDials: 3421,
    connected: 2567,
    connectRate: 75.0,
    converted: 892,
    conversionRate: 34.7,
    penetrationRate: 100,
    avgCallDuration: '4:56',
    leadsRemaining: 0,
  },
  {
    id: 'CMP-006',
    name: 'Win-back Campaign',
    status: 'paused',
    totalDials: 412,
    connected: 289,
    connectRate: 70.1,
    converted: 78,
    conversionRate: 27.0,
    penetrationRate: 23.4,
    avgCallDuration: '5:32',
    leadsRemaining: 1348,
  },
];

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'paused':
      return 'warning';
    case 'completed':
      return 'default';
    default:
      return 'default';
  }
};

export default function CampaignsPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const columns: Column<CampaignReport>[] = [
    {
      key: 'name',
      header: 'Campaign',
      accessor: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.id}</div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => (
        <Badge variant={getStatusVariant(row.status) as any}>
          {row.status}
        </Badge>
      ),
      sortable: true,
    },
    {
      key: 'totalDials',
      header: 'Total Dials',
      accessor: (row) => (
        <span className="font-semibold">{row.totalDials.toLocaleString()}</span>
      ),
      sortable: true,
    },
    {
      key: 'connectRate',
      header: 'Connect Rate',
      accessor: (row) => (
        <div>
          <div className="font-semibold">{row.connectRate}%</div>
          <div className="text-xs text-muted-foreground">
            {row.connected}/{row.totalDials}
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'conversionRate',
      header: 'Conversion Rate',
      accessor: (row) => (
        <div>
          <div className="font-semibold">{row.conversionRate}%</div>
          <div className="text-xs text-muted-foreground">
            {row.converted} conversions
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'penetrationRate',
      header: 'Penetration',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${row.penetrationRate}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-medium w-12">
            {row.penetrationRate}%
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'avgCallDuration',
      header: 'Avg Duration',
      accessor: (row) => (
        <span className="font-mono text-sm">{row.avgCallDuration}</span>
      ),
      sortable: true,
    },
    {
      key: 'leadsRemaining',
      header: 'Leads Remaining',
      accessor: (row) => (
        <span className="text-sm">{row.leadsRemaining.toLocaleString()}</span>
      ),
      sortable: true,
    },
  ];

  // Lead status breakdown for pie chart
  const leadStatusData = [
    { name: 'Converted', value: 2159, color: '#22c55e' },
    { name: 'Follow-up', value: 892, color: '#3b82f6' },
    { name: 'Not Interested', value: 1234, color: '#ef4444' },
    { name: 'No Answer', value: 1567, color: '#f59e0b' },
    { name: 'Callback', value: 456, color: '#8b5cf6' },
  ];

  // Calls per day trend
  const callTrendData = [
    { name: 'Mon', value: 1234 },
    { name: 'Tue', value: 1456 },
    { name: 'Wed', value: 1323 },
    { name: 'Thu', value: 1589 },
    { name: 'Fri', value: 1712 },
    { name: 'Sat', value: 892 },
    { name: 'Sun', value: 567 },
  ];

  const handleExport = () => {
    console.log('Exporting campaign reports...');
  };

  const activeCampaigns = mockCampaignData.filter((c) => c.status === 'active');
  const totalDials = activeCampaigns.reduce((sum, c) => sum + c.totalDials, 0);
  const totalConnected = activeCampaigns.reduce((sum, c) => sum + c.connected, 0);
  const totalConverted = activeCampaigns.reduce((sum, c) => sum + c.converted, 0);
  const avgConnectRate = (totalConnected / totalDials) * 100;
  const avgConversionRate = (totalConverted / totalConnected) * 100;

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
              Campaign Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Campaign analytics and conversion rates
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
          <div className="grid gap-4 md:grid-cols-3">
            <DateRangePicker />
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Campaign status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {mockCampaignData.length - activeCampaigns.length} inactive
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Dials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDials.toLocaleString()}</div>
            <p className="text-xs text-green-600 mt-1">+15.3% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Connect Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConnectRate.toFixed(1)}%</div>
            <p className="text-xs text-green-600 mt-1">+2.4% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgConversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-red-600 mt-1">-1.2% from last week</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartWidget
          title="Lead Status Breakdown"
          description="Distribution of all leads across campaigns"
        >
          <PieChart data={leadStatusData} height={280} />
        </ChartWidget>
        <ChartWidget
          title="Calls Per Day Trend"
          description="Daily call volume over the past week"
        >
          <LineChart data={callTrendData} height={280} />
        </ChartWidget>
      </div>

      {/* Campaign Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Campaign Performance</CardTitle>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={mockCampaignData}
            columns={columns}
            searchable
            searchPlaceholder="Search campaigns..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
