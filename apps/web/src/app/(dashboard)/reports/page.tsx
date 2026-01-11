'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MetricCard } from './components/metric-card';
import { DateRangePicker } from './components/date-range-picker';
import {
  Phone,
  Clock,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  Activity,
  PieChart,
  Calendar,
  Download,
} from 'lucide-react';

const quickReports = [
  {
    title: 'Call Detail Records',
    description: 'Detailed call history and recordings',
    icon: Phone,
    href: '/reports/calls',
    color: 'text-blue-600',
  },
  {
    title: 'Agent Performance',
    description: 'Individual agent metrics and KPIs',
    icon: Users,
    href: '/reports/performance',
    color: 'text-green-600',
  },
  {
    title: 'Campaign Reports',
    description: 'Campaign analytics and conversion rates',
    icon: PieChart,
    href: '/reports/campaigns',
    color: 'text-purple-600',
  },
  {
    title: 'Real-time Dashboard',
    description: 'Live monitoring and current statistics',
    icon: Activity,
    href: '/reports/realtime',
    color: 'text-orange-600',
  },
  {
    title: 'Custom Report Builder',
    description: 'Create custom reports with filters',
    icon: BarChart3,
    href: '/reports/builder',
    color: 'text-pink-600',
  },
];

const recentReports = [
  {
    name: 'Daily Call Summary - Jan 9, 2026',
    type: 'Call Detail Records',
    date: '2026-01-09 18:30',
  },
  {
    name: 'Weekly Agent Performance',
    type: 'Agent Performance',
    date: '2026-01-08 09:15',
  },
  {
    name: 'Q4 2025 Campaign Analysis',
    type: 'Campaign Reports',
    date: '2026-01-05 14:20',
  },
];

const scheduledReports = [
  {
    name: 'Daily Operations Summary',
    schedule: 'Daily at 9:00 AM',
    recipients: 'management@nexusdialer.com',
    nextRun: '2026-01-11 09:00',
  },
  {
    name: 'Weekly Performance Report',
    schedule: 'Monday at 8:00 AM',
    recipients: 'supervisors@nexusdialer.com',
    nextRun: '2026-01-13 08:00',
  },
  {
    name: 'Monthly Executive Summary',
    schedule: '1st of month at 10:00 AM',
    recipients: 'executives@nexusdialer.com',
    nextRun: '2026-02-01 10:00',
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive reporting and analytics dashboard
          </p>
        </div>
        <DateRangePicker className="w-[300px]" />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Calls Today"
          value="1,247"
          change={12.5}
          icon={Phone}
        />
        <MetricCard
          title="Avg Handle Time"
          value="4:32"
          change={-5.2}
          icon={Clock}
          description="Minutes:Seconds"
        />
        <MetricCard
          title="Service Level"
          value="87.3%"
          change={3.1}
          icon={TrendingUp}
          description="80/20 target"
        />
        <MetricCard
          title="Active Agents"
          value="42"
          icon={Users}
          description="Out of 58 total"
        />
      </div>

      {/* Quick Report Links */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Reports</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickReports.map((report) => {
            const Icon = report.icon;
            return (
              <Link key={report.href} href={report.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">
                      {report.title}
                    </CardTitle>
                    <Icon className={`h-5 w-5 ${report.color}`} />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {report.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recently Viewed Reports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recently Viewed</CardTitle>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentReports.map((report, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between border-b last:border-0 pb-3 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{report.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {report.date}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Reports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Scheduled Reports</CardTitle>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scheduledReports.map((report, index) => (
                <div
                  key={index}
                  className="border-b last:border-0 pb-3 last:pb-0 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{report.name}</p>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {report.schedule}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Next run: {report.nextRun}
                  </p>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-4">
                Create Scheduled Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
