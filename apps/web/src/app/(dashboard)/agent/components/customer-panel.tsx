'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Mail,
  MapPin,
  Phone,
  Calendar,
  Tag,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  PhoneCall,
} from 'lucide-react';

interface CustomerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  tags: string[];
  customFields: Record<string, string>;
  callHistory: CallHistoryItem[];
  notes: Note[];
}

interface CallHistoryItem {
  id: string;
  date: string;
  duration: string;
  disposition: string;
  agent: string;
  outcome: 'success' | 'failed' | 'callback';
}

interface Note {
  id: string;
  text: string;
  createdBy: string;
  createdAt: string;
}

const mockCustomerData: CustomerData = {
  id: 'CUST-001',
  name: 'John Smith',
  email: 'john.smith@example.com',
  phone: '+1 (555) 123-4567',
  address: '123 Main Street',
  city: 'New York',
  state: 'NY',
  zip: '10001',
  tags: ['VIP', 'Enterprise', 'High Value'],
  customFields: {
    'Account Type': 'Premium',
    'Customer Since': '2022-03-15',
    'Last Purchase': '$2,499.99',
    'Lifetime Value': '$15,780.00',
    'Preferred Language': 'English',
    'Time Zone': 'EST',
  },
  callHistory: [
    {
      id: '1',
      date: '2024-01-08 14:30',
      duration: '8m 45s',
      disposition: 'Sale - Upgrade',
      agent: 'Sarah Johnson',
      outcome: 'success',
    },
    {
      id: '2',
      date: '2024-01-05 10:15',
      duration: '12m 20s',
      disposition: 'Information Request',
      agent: 'Mike Davis',
      outcome: 'success',
    },
    {
      id: '3',
      date: '2024-01-02 16:45',
      duration: '5m 30s',
      disposition: 'Callback Scheduled',
      agent: 'Sarah Johnson',
      outcome: 'callback',
    },
    {
      id: '4',
      date: '2023-12-28 11:20',
      duration: '3m 15s',
      disposition: 'No Answer',
      agent: 'Tom Wilson',
      outcome: 'failed',
    },
  ],
  notes: [
    {
      id: '1',
      text: 'Customer interested in enterprise plan upgrade. Mentioned budget approval needed from CFO. Follow up in 2 weeks.',
      createdBy: 'Sarah Johnson',
      createdAt: '2024-01-08 14:35',
    },
    {
      id: '2',
      text: 'Requested detailed pricing breakdown for team expansion (50+ users). Sent proposal via email.',
      createdBy: 'Mike Davis',
      createdAt: '2024-01-05 10:20',
    },
    {
      id: '3',
      text: 'Customer mentioned potential referral opportunities. Asked to schedule demo for partner company.',
      createdBy: 'Sarah Johnson',
      createdAt: '2024-01-02 16:50',
    },
  ],
};

export function CustomerPanel() {
  const customer = mockCustomerData;

  const getOutcomeIcon = (outcome: CallHistoryItem['outcome']) => {
    switch (outcome) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'callback':
        return <PhoneCall className="h-4 w-4 text-orange-500" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Customer 360 View</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          {/* Contact Information Tab */}
          <TabsContent value="info" className="space-y-4">
            <ScrollArea className="h-[600px] pr-4">
              {/* Customer Header */}
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="" alt={customer.name} />
                  <AvatarFallback className="text-lg">
                    {customer.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{customer.name}</h3>
                  <p className="text-sm text-muted-foreground">ID: {customer.id}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Contact Details */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Contact Details</h4>

                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.address}
                      <br />
                      {customer.city}, {customer.state} {customer.zip}
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Custom Fields */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Additional Information</h4>
                <div className="grid gap-3">
                  {Object.entries(customer.customFields).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">{key}</span>
                      <span className="text-sm font-medium text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Call History Tab */}
          <TabsContent value="history" className="space-y-4">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {customer.callHistory.map((call) => (
                  <Card key={call.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getOutcomeIcon(call.outcome)}
                          <span className="font-medium text-sm">{call.disposition}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {call.duration}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {call.date}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          Agent: {call.agent}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {customer.notes.map((note) => (
                  <Card key={note.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm">{note.text}</p>
                        </div>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{note.createdBy}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {note.createdAt}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
