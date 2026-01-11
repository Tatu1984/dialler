'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Play,
  Pause,
  Download,
  Search,
  Calendar,
  Clock,
  Phone,
  User,
  FileAudio,
  Star,
  MessageSquare,
  Filter,
} from 'lucide-react';

// Mock data for recordings
const mockRecordings = [
  {
    id: '1',
    callId: 'CALL-2024-001234',
    agent: 'Andy Agent',
    customer: '+1 (555) 123-4567',
    customerName: 'John Smith',
    date: '2024-01-10',
    time: '09:15:32',
    duration: '04:23',
    campaign: 'Sales Q1',
    disposition: 'Sale',
    quality: 4.5,
    hasTranscript: true,
  },
  {
    id: '2',
    callId: 'CALL-2024-001235',
    agent: 'Sarah Supervisor',
    customer: '+1 (555) 234-5678',
    customerName: 'Jane Doe',
    date: '2024-01-10',
    time: '09:32:15',
    duration: '06:47',
    campaign: 'Customer Service',
    disposition: 'Resolved',
    quality: 5.0,
    hasTranscript: true,
  },
  {
    id: '3',
    callId: 'CALL-2024-001236',
    agent: 'Andy Agent',
    customer: '+1 (555) 345-6789',
    customerName: 'Bob Wilson',
    date: '2024-01-10',
    time: '10:05:22',
    duration: '02:15',
    campaign: 'Sales Q1',
    disposition: 'Callback',
    quality: 3.5,
    hasTranscript: false,
  },
  {
    id: '4',
    callId: 'CALL-2024-001237',
    agent: 'Mike Manager',
    customer: '+1 (555) 456-7890',
    customerName: 'Alice Brown',
    date: '2024-01-10',
    time: '10:45:10',
    duration: '08:32',
    campaign: 'Support Tier 2',
    disposition: 'Escalated',
    quality: 4.0,
    hasTranscript: true,
  },
  {
    id: '5',
    callId: 'CALL-2024-001238',
    agent: 'Andy Agent',
    customer: '+1 (555) 567-8901',
    customerName: 'Charlie Davis',
    date: '2024-01-09',
    time: '14:20:45',
    duration: '03:56',
    campaign: 'Sales Q1',
    disposition: 'No Answer',
    quality: null,
    hasTranscript: false,
  },
];

export default function RecordingsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const filteredRecordings = mockRecordings.filter((recording) => {
    const matchesSearch =
      recording.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recording.customer.includes(searchTerm) ||
      recording.callId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAgent = selectedAgent === 'all' || recording.agent === selectedAgent;
    const matchesCampaign = selectedCampaign === 'all' || recording.campaign === selectedCampaign;
    return matchesSearch && matchesAgent && matchesCampaign;
  });

  const renderQualityStars = (quality: number | null) => {
    if (quality === null) return <span className="text-muted-foreground text-sm">N/A</span>;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= quality ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm ml-1">{quality.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Call Recordings</h1>
          <p className="text-muted-foreground">Search, play, and analyze call recordings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Selected
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Recordings</CardTitle>
            <FileAudio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <FileAudio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45.2 GB</div>
            <p className="text-xs text-muted-foreground">Of 100 GB</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2</div>
            <p className="text-xs text-muted-foreground">Out of 5.0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Transcribed</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89%</div>
            <p className="text-xs text-muted-foreground">Auto-transcription rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Call ID, customer, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Agent</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  <SelectItem value="Andy Agent">Andy Agent</SelectItem>
                  <SelectItem value="Sarah Supervisor">Sarah Supervisor</SelectItem>
                  <SelectItem value="Mike Manager">Mike Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="All campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  <SelectItem value="Sales Q1">Sales Q1</SelectItem>
                  <SelectItem value="Customer Service">Customer Service</SelectItem>
                  <SelectItem value="Support Tier 2">Support Tier 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Last 7 days
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recordings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recordings</CardTitle>
          <CardDescription>
            {filteredRecordings.length} recordings found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Play</TableHead>
                <TableHead>Call ID</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Disposition</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecordings.map((recording) => (
                <TableRow key={recording.id}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setPlayingId(playingId === recording.id ? null : recording.id)
                      }
                    >
                      {playingId === recording.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{recording.callId}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {recording.agent}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{recording.customerName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {recording.customer}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {recording.date}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {recording.time}
                    </div>
                  </TableCell>
                  <TableCell>{recording.duration}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                      {recording.campaign}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        recording.disposition === 'Sale'
                          ? 'bg-green-100 text-green-700'
                          : recording.disposition === 'Resolved'
                          ? 'bg-green-100 text-green-700'
                          : recording.disposition === 'Callback'
                          ? 'bg-yellow-100 text-yellow-700'
                          : recording.disposition === 'Escalated'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {recording.disposition}
                    </span>
                  </TableCell>
                  <TableCell>{renderQualityStars(recording.quality)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="Download">
                        <Download className="h-4 w-4" />
                      </Button>
                      {recording.hasTranscript && (
                        <Button variant="ghost" size="icon" title="View Transcript">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Audio Player (when playing) */}
      {playingId && (
        <Card className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[600px] shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPlayingId(null)}
              >
                <Pause className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Call ID: {mockRecordings.find((r) => r.id === playingId)?.callId}</span>
                  <span>00:45 / {mockRecordings.find((r) => r.id === playingId)?.duration}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full">
                  <div className="h-full w-1/4 bg-primary rounded-full" />
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
