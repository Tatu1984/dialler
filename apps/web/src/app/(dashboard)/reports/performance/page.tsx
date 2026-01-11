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
import { ChartWidget, BarChart } from '../components/chart-widget';
import { ArrowLeft, TrendingUp, TrendingDown, Download } from 'lucide-react';
import Link from 'next/link';

interface AgentPerformance {
  id: string;
  name: string;
  callsHandled: number;
  avgHandleTime: string;
  talkTime: string;
  wrapTime: string;
  conversionRate: number;
  qualityScore: number;
  availability: number;
}

// Mock data
const mockPerformanceData: AgentPerformance[] = [
  {
    id: 'AGT-001',
    name: 'Sarah Johnson',
    callsHandled: 87,
    avgHandleTime: '4:32',
    talkTime: '3:45',
    wrapTime: '0:47',
    conversionRate: 28.7,
    qualityScore: 94,
    availability: 92.3,
  },
  {
    id: 'AGT-002',
    name: 'Mike Chen',
    callsHandled: 92,
    avgHandleTime: '5:18',
    talkTime: '4:22',
    wrapTime: '0:56',
    conversionRate: 31.5,
    qualityScore: 96,
    availability: 89.1,
  },
  {
    id: 'AGT-003',
    name: 'Lisa Anderson',
    callsHandled: 78,
    avgHandleTime: '3:58',
    talkTime: '3:12',
    wrapTime: '0:46',
    conversionRate: 24.4,
    qualityScore: 88,
    availability: 95.7,
  },
  {
    id: 'AGT-004',
    name: 'Tom Martinez',
    callsHandled: 95,
    avgHandleTime: '4:45',
    talkTime: '3:58',
    wrapTime: '0:47',
    conversionRate: 29.8,
    qualityScore: 91,
    availability: 91.2,
  },
  {
    id: 'AGT-005',
    name: 'Jennifer Lee',
    callsHandled: 82,
    avgHandleTime: '5:05',
    talkTime: '4:15',
    wrapTime: '0:50',
    conversionRate: 26.8,
    qualityScore: 93,
    availability: 88.5,
  },
  {
    id: 'AGT-006',
    name: 'David Brown',
    callsHandled: 89,
    avgHandleTime: '4:12',
    talkTime: '3:28',
    wrapTime: '0:44',
    conversionRate: 33.7,
    qualityScore: 97,
    availability: 93.8,
  },
];

const getScoreVariant = (score: number) => {
  if (score >= 90) return 'success';
  if (score >= 75) return 'info';
  if (score >= 60) return 'warning';
  return 'destructive';
};

export default function PerformancePage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('today');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  const columns: Column<AgentPerformance>[] = [
    {
      key: 'name',
      header: 'Agent',
      accessor: (row) => (
        <div className="font-medium">
          {row.name}
          <div className="text-xs text-muted-foreground">{row.id}</div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'callsHandled',
      header: 'Calls Handled',
      accessor: (row) => (
        <span className="font-semibold">{row.callsHandled}</span>
      ),
      sortable: true,
    },
    {
      key: 'avgHandleTime',
      header: 'Avg Handle Time',
      accessor: (row) => (
        <span className="font-mono text-sm">{row.avgHandleTime}</span>
      ),
      sortable: true,
    },
    {
      key: 'talkTime',
      header: 'Talk Time',
      accessor: (row) => (
        <span className="font-mono text-sm">{row.talkTime}</span>
      ),
      sortable: true,
    },
    {
      key: 'wrapTime',
      header: 'Wrap Time',
      accessor: (row) => (
        <span className="font-mono text-sm">{row.wrapTime}</span>
      ),
      sortable: true,
    },
    {
      key: 'conversionRate',
      header: 'Conversion Rate',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">{row.conversionRate}%</span>
          {row.conversionRate > 30 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : row.conversionRate < 25 ? (
            <TrendingDown className="h-4 w-4 text-red-600" />
          ) : null}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'qualityScore',
      header: 'Quality Score',
      accessor: (row) => (
        <Badge variant={getScoreVariant(row.qualityScore) as any}>
          {row.qualityScore}%
        </Badge>
      ),
      sortable: true,
    },
    {
      key: 'availability',
      header: 'Availability',
      accessor: (row) => <span className="text-sm">{row.availability}%</span>,
      sortable: true,
    },
  ];

  const chartData = mockPerformanceData
    .sort((a, b) => b.callsHandled - a.callsHandled)
    .slice(0, 5)
    .map((agent) => ({
      name: agent.name.split(' ')[0],
      value: agent.callsHandled,
    }));

  const conversionChartData = mockPerformanceData
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 5)
    .map((agent) => ({
      name: agent.name.split(' ')[0],
      value: agent.conversionRate,
    }));

  const handleExport = () => {
    console.log('Exporting performance data...');
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
              Agent Performance
            </h1>
            <p className="text-muted-foreground mt-1">
              Individual agent metrics and KPIs
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
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                <SelectItem value="sales">Sales Team</SelectItem>
                <SelectItem value="support">Support Team</SelectItem>
                <SelectItem value="outbound">Outbound Team</SelectItem>
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
              Total Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">523</div>
            <p className="text-xs text-green-600 mt-1">+12.5% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">93.2%</div>
            <p className="text-xs text-green-600 mt-1">+2.1% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">29.2%</div>
            <p className="text-xs text-red-600 mt-1">-1.3% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">91.8%</div>
            <p className="text-xs text-green-600 mt-1">+0.8% from yesterday</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartWidget title="Top Performers by Calls Handled">
          <BarChart data={chartData} height={250} />
        </ChartWidget>
        <ChartWidget title="Top Performers by Conversion Rate">
          <BarChart data={conversionChartData} height={250} />
        </ChartWidget>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Agent Performance Metrics</CardTitle>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={mockPerformanceData}
            columns={columns}
            searchable
            searchPlaceholder="Search agents..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
