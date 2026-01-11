'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangePicker } from '../components/date-range-picker';
import { ChartWidget, BarChart, LineChart, PieChart } from '../components/chart-widget';
import { DataTable, Column } from '../components/data-table';
import { ArrowLeft, Plus, X, Save, Play } from 'lucide-react';
import Link from 'next/link';

interface Metric {
  id: string;
  name: string;
  category: string;
}

interface Dimension {
  id: string;
  name: string;
}

interface Filter {
  id: string;
  field: string;
  operator: string;
  value: string;
}

const availableMetrics: Metric[] = [
  { id: 'calls', name: 'Total Calls', category: 'calls' },
  { id: 'duration', name: 'Call Duration', category: 'calls' },
  { id: 'handle_time', name: 'Handle Time', category: 'calls' },
  { id: 'talk_time', name: 'Talk Time', category: 'calls' },
  { id: 'wrap_time', name: 'Wrap Time', category: 'calls' },
  { id: 'conversion_rate', name: 'Conversion Rate', category: 'performance' },
  { id: 'connect_rate', name: 'Connect Rate', category: 'performance' },
  { id: 'quality_score', name: 'Quality Score', category: 'performance' },
  { id: 'service_level', name: 'Service Level', category: 'performance' },
  { id: 'abandonment_rate', name: 'Abandonment Rate', category: 'queue' },
  { id: 'wait_time', name: 'Wait Time', category: 'queue' },
];

const availableDimensions: Dimension[] = [
  { id: 'agent', name: 'Agent' },
  { id: 'campaign', name: 'Campaign' },
  { id: 'date', name: 'Date' },
  { id: 'hour', name: 'Hour of Day' },
  { id: 'day', name: 'Day of Week' },
  { id: 'disposition', name: 'Disposition' },
  { id: 'queue', name: 'Queue' },
  { id: 'team', name: 'Team' },
];

const filterFields = [
  'Agent',
  'Campaign',
  'Disposition',
  'Queue',
  'Team',
  'Duration',
  'Date',
];

const filterOperators = [
  'equals',
  'not equals',
  'contains',
  'greater than',
  'less than',
  'between',
];

export default function BuilderPage() {
  const [reportName, setReportName] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedDimension, setSelectedDimension] = useState<string>('');
  const [visualizationType, setVisualizationType] = useState<string>('table');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId)
        ? prev.filter((id) => id !== metricId)
        : [...prev, metricId]
    );
  };

  const addFilter = () => {
    setFilters([
      ...filters,
      {
        id: Date.now().toString(),
        field: '',
        operator: '',
        value: '',
      },
    ]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter((f) => f.id !== id));
  };

  const updateFilter = (
    id: string,
    field: keyof Filter,
    value: string
  ) => {
    setFilters(
      filters.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleRunReport = () => {
    setShowPreview(true);
  };

  const handleSaveReport = () => {
    console.log('Saving report:', {
      name: reportName,
      metrics: selectedMetrics,
      dimension: selectedDimension,
      visualization: visualizationType,
      filters,
    });
  };

  // Mock preview data
  const mockTableData = [
    {
      dimension: 'Sarah Johnson',
      calls: 87,
      avgDuration: '4:32',
      conversionRate: 28.7,
    },
    {
      dimension: 'Mike Chen',
      calls: 92,
      avgDuration: '5:18',
      conversionRate: 31.5,
    },
    {
      dimension: 'Lisa Anderson',
      calls: 78,
      avgDuration: '3:58',
      conversionRate: 24.4,
    },
  ];

  const mockChartData = [
    { name: 'Sarah', value: 87 },
    { name: 'Mike', value: 92 },
    { name: 'Lisa', value: 78 },
    { name: 'Tom', value: 95 },
    { name: 'Jennifer', value: 82 },
  ];

  const mockPieData = [
    { name: 'Sarah', value: 87, color: '#3b82f6' },
    { name: 'Mike', value: 92, color: '#22c55e' },
    { name: 'Lisa', value: 78, color: '#f59e0b' },
    { name: 'Tom', value: 95, color: '#8b5cf6' },
    { name: 'Jennifer', value: 82, color: '#ef4444' },
  ];

  const previewColumns: Column<any>[] = [
    {
      key: 'dimension',
      header:
        availableDimensions.find((d) => d.id === selectedDimension)?.name ||
        'Dimension',
      accessor: (row) => <span className="font-medium">{row.dimension}</span>,
      sortable: true,
    },
    ...selectedMetrics.map((metricId) => {
      const metric = availableMetrics.find((m) => m.id === metricId);
      return {
        key: metricId,
        header: metric?.name || metricId,
        accessor: (row: any) => (
          <span className="font-semibold">{row[metricId]}</span>
        ),
        sortable: true,
      };
    }),
  ];

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
              Custom Report Builder
            </h1>
            <p className="text-muted-foreground mt-1">
              Create custom reports with filters and visualizations
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveReport}>
            <Save className="h-4 w-4 mr-2" />
            Save Report
          </Button>
          <Button onClick={handleRunReport}>
            <Play className="h-4 w-4 mr-2" />
            Run Report
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Report Name */}
          <Card>
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reportName">Report Name</Label>
                <Input
                  id="reportName"
                  placeholder="My Custom Report"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Metrics Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Metrics</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose one or more metrics to analyze
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(
                  availableMetrics.reduce((acc, metric) => {
                    if (!acc[metric.category]) {
                      acc[metric.category] = [];
                    }
                    acc[metric.category].push(metric);
                    return acc;
                  }, {} as Record<string, Metric[]>)
                ).map(([category, metrics]) => (
                  <div key={category} className="space-y-2">
                    <div className="text-sm font-medium capitalize">
                      {category}
                    </div>
                    <div className="space-y-2">
                      {metrics.map((metric) => (
                        <div
                          key={metric.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={metric.id}
                            checked={selectedMetrics.includes(metric.id)}
                            onCheckedChange={() =>
                              handleMetricToggle(metric.id)
                            }
                          />
                          <label
                            htmlFor={metric.id}
                            className="text-sm cursor-pointer"
                          >
                            {metric.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dimension Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Group By</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose a dimension to group your data
              </p>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedDimension}
                onValueChange={setSelectedDimension}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dimension" />
                </SelectTrigger>
                <SelectContent>
                  {availableDimensions.map((dim) => (
                    <SelectItem key={dim.id} value={dim.id}>
                      {dim.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Visualization Type */}
          <Card>
            <CardHeader>
              <CardTitle>Visualization</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose how to display your data
              </p>
            </CardHeader>
            <CardContent>
              <Select
                value={visualizationType}
                onValueChange={setVisualizationType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Filters</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Add filters to narrow down your data
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={addFilter}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filters.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No filters added. Click "Add Filter" to get started.
                  </p>
                ) : (
                  filters.map((filter) => (
                    <div
                      key={filter.id}
                      className="flex items-center gap-2 p-3 border rounded-lg"
                    >
                      <Select
                        value={filter.field}
                        onValueChange={(value) =>
                          updateFilter(filter.id, 'field', value)
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          {filterFields.map((field) => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={filter.operator}
                        onValueChange={(value) =>
                          updateFilter(filter.id, 'operator', value)
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {filterOperators.map((op) => (
                            <SelectItem key={op} value={op}>
                              {op}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Value"
                        value={filter.value}
                        onChange={(e) =>
                          updateFilter(filter.id, 'value', e.target.value)
                        }
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFilter(filter.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card>
            <CardHeader>
              <CardTitle>Date Range</CardTitle>
            </CardHeader>
            <CardContent>
              <DateRangePicker />
            </CardContent>
          </Card>

          {/* Preview */}
          {showPreview && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Preview</CardTitle>
                  {selectedMetrics.length > 0 && (
                    <div className="flex gap-2">
                      {selectedMetrics.map((metricId) => {
                        const metric = availableMetrics.find(
                          (m) => m.id === metricId
                        );
                        return (
                          <Badge key={metricId} variant="secondary">
                            {metric?.name}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedMetrics.length === 0 || !selectedDimension ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Select at least one metric and a dimension to preview</p>
                  </div>
                ) : visualizationType === 'table' ? (
                  <DataTable data={mockTableData} columns={previewColumns} />
                ) : visualizationType === 'bar' ? (
                  <BarChart data={mockChartData} height={300} />
                ) : visualizationType === 'line' ? (
                  <LineChart data={mockChartData} height={300} />
                ) : (
                  <PieChart data={mockPieData} height={300} />
                )}
              </CardContent>
            </Card>
          )}

          {!showPreview && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg font-medium mb-2">
                    Configure your report and click "Run Report" to see the
                    preview
                  </p>
                  <p className="text-sm">
                    Select metrics, dimensions, and filters to customize your
                    report
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
