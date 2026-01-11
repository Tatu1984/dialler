'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  Mic,
  MicOff,
  Pause,
  Play,
  PhoneForwarded,
  Volume2,
  Circle,
  User,
  MapPin,
  Mail,
  Calendar,
  Clock,
  FileText,
  MessageSquare,
  History,
  Star,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Building,
  Send,
  BookOpen,
  Sparkles,
} from 'lucide-react';

// Mock current call data
const mockCall = {
  id: 'CALL-2024-001234',
  customer: {
    name: 'John Smith',
    phone: '+1 (555) 123-4567',
    email: 'john.smith@email.com',
    location: 'New York, NY',
    company: 'Acme Corp',
    title: 'Director of Operations',
    lifetime_value: '$12,450',
    timezone: 'EST',
  },
  campaign: 'Sales Q1',
  queue: 'Sales Team',
  waitTime: '00:45',
  callType: 'inbound',
};

// Mock call history
const mockCallHistory = [
  { date: '2024-01-08', time: '14:30', duration: '5:23', agent: 'Sarah J.', disposition: 'Callback', notes: 'Interested, call back Tuesday' },
  { date: '2024-01-03', time: '10:15', duration: '3:45', agent: 'Mike D.', disposition: 'No Answer', notes: 'Left voicemail' },
  { date: '2023-12-28', time: '16:00', duration: '8:12', agent: 'Sarah J.', disposition: 'Sale', notes: 'Purchased basic plan' },
];

// Mock script
const mockScript = [
  { id: 1, type: 'greeting', text: 'Hello, thank you for calling! My name is [Agent Name]. How can I help you today?' },
  { id: 2, type: 'qualifier', text: 'Before we proceed, may I ask what prompted your interest in our services?' },
  { id: 3, type: 'pitch', text: 'Based on what you\'ve shared, I think our Premium Plan would be perfect for you. It includes...' },
  { id: 4, type: 'objection', text: 'I understand your concern about the price. Many of our customers felt the same way initially, but found that...' },
  { id: 5, type: 'close', text: 'Would you like to get started today? I can have you set up in just a few minutes.' },
];

// Mock AI suggestions
const mockAISuggestions = [
  { type: 'info', text: 'Customer has been with us for 2 years. Consider mentioning loyalty discount.' },
  { type: 'warning', text: 'Sentiment detected: slightly frustrated. Consider acknowledging wait time.' },
  { type: 'tip', text: 'Similar customers responded well to the "time-saving" value proposition.' },
];

export default function ActiveCallPage() {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [currentScriptStep, setCurrentScriptStep] = useState(0);
  const [notes, setNotes] = useState('');
  const [selectedDisposition, setSelectedDisposition] = useState('');

  // Call timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOnHold) {
        setCallDuration((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isOnHold]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const dispositions = [
    { id: 'sale', label: 'Sale', icon: DollarSign, color: 'bg-green-100 text-green-700' },
    { id: 'callback', label: 'Callback', icon: Calendar, color: 'bg-blue-100 text-blue-700' },
    { id: 'not-interested', label: 'Not Interested', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
    { id: 'dnc', label: 'Do Not Call', icon: PhoneOff, color: 'bg-gray-100 text-gray-700' },
    { id: 'voicemail', label: 'Voicemail', icon: MessageSquare, color: 'bg-yellow-100 text-yellow-700' },
    { id: 'qualified', label: 'Qualified Lead', icon: Star, color: 'bg-purple-100 text-purple-700' },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Call Status Bar */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Call Status */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold font-mono">{formatDuration(callDuration)}</span>
                    {isRecording && (
                      <Badge variant="destructive" className="gap-1">
                        <Circle className="h-2 w-2 fill-current animate-pulse" />
                        REC
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {mockCall.callType === 'inbound' ? 'Inbound' : 'Outbound'} • {mockCall.campaign}
                  </p>
                </div>
              </div>

              <Separator orientation="vertical" className="h-12" />

              {/* Customer Quick Info */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{mockCall.customer.name}</h3>
                  <p className="text-sm text-muted-foreground">{mockCall.customer.phone}</p>
                </div>
              </div>
            </div>

            {/* Call Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={isMuted ? 'destructive' : 'outline'}
                size="lg"
                onClick={() => setIsMuted(!isMuted)}
                className="gap-2"
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>
              <Button
                variant={isOnHold ? 'secondary' : 'outline'}
                size="lg"
                onClick={() => setIsOnHold(!isOnHold)}
                className="gap-2"
              >
                {isOnHold ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                {isOnHold ? 'Resume' : 'Hold'}
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                <PhoneForwarded className="h-5 w-5" />
                Transfer
              </Button>
              <Button variant="destructive" size="lg" className="gap-2">
                <PhoneOff className="h-5 w-5" />
                End Call
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Panel - Customer Info */}
        <div className="col-span-3 flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{mockCall.customer.company}</p>
                    <p className="text-xs text-muted-foreground">{mockCall.customer.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{mockCall.customer.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{mockCall.customer.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{mockCall.customer.timezone}</p>
                </div>
              </div>

              <Separator />

              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Lifetime Value</span>
                </div>
                <p className="text-xl font-bold text-green-700">{mockCall.customer.lifetime_value}</p>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Call History
                </h4>
                <ScrollArea className="h-[180px]">
                  <div className="space-y-3">
                    {mockCallHistory.map((call, idx) => (
                      <div key={idx} className="p-2 bg-muted/50 rounded-lg text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{call.date}</span>
                          <Badge variant="outline" className="text-xs">
                            {call.disposition}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {call.agent} • {call.duration}
                        </p>
                        <p className="text-xs mt-1">{call.notes}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Panel - Script & AI Assist */}
        <div className="col-span-5 flex flex-col gap-4">
          <Card className="flex-1 flex flex-col min-h-0">
            <Tabs defaultValue="script" className="flex-1 flex flex-col">
              <CardHeader className="pb-0">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="script" className="gap-2">
                    <BookOpen className="h-4 w-4" />
                    Script
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Assist
                  </TabsTrigger>
                  <TabsTrigger value="knowledge" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Knowledge
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="flex-1 pt-4 min-h-0">
                <TabsContent value="script" className="h-full m-0">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-3">
                      {mockScript.map((step, idx) => (
                        <div
                          key={step.id}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                            currentScriptStep === idx
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent hover:border-muted'
                          }`}
                          onClick={() => setCurrentScriptStep(idx)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={currentScriptStep === idx ? 'default' : 'outline'}
                              className="text-xs capitalize"
                            >
                              {step.type}
                            </Badge>
                            {currentScriptStep === idx && (
                              <Badge variant="secondary" className="text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed">{step.text}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="ai" className="h-full m-0">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-3">
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          <span className="font-medium text-purple-800">Real-time Analysis</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold text-green-600">72%</p>
                            <p className="text-xs text-muted-foreground">Positive Sentiment</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-blue-600">High</p>
                            <p className="text-xs text-muted-foreground">Intent Score</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-orange-600">Medium</p>
                            <p className="text-xs text-muted-foreground">Objection Risk</p>
                          </div>
                        </div>
                      </div>

                      {mockAISuggestions.map((suggestion, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${
                            suggestion.type === 'warning'
                              ? 'bg-yellow-50 border-yellow-200'
                              : suggestion.type === 'tip'
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {suggestion.type === 'warning' ? (
                              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                            ) : suggestion.type === 'tip' ? (
                              <Sparkles className="h-4 w-4 text-blue-600 mt-0.5" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-600 mt-0.5" />
                            )}
                            <p className="text-sm">{suggestion.text}</p>
                          </div>
                        </div>
                      ))}

                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">Suggested Response</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            "I appreciate your patience today, and I want to make sure we find the
                            best solution for your needs. Based on our conversation, I'd recommend..."
                          </p>
                          <Button size="sm" variant="outline" className="gap-2">
                            <Send className="h-4 w-4" />
                            Use This Response
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="knowledge" className="h-full m-0">
                  <div className="space-y-4">
                    <div className="relative">
                      <Input placeholder="Search knowledge base..." className="pr-10" />
                      <Button size="sm" variant="ghost" className="absolute right-1 top-1 h-7 w-7 p-0">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-2">
                        {[
                          { title: 'Premium Plan Features', category: 'Products' },
                          { title: 'Pricing & Discounts', category: 'Sales' },
                          { title: 'Common Objection Handling', category: 'Training' },
                          { title: 'Refund Policy', category: 'Policies' },
                          { title: 'Technical Specifications', category: 'Products' },
                        ].map((article, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{article.title}</p>
                                <p className="text-xs text-muted-foreground">{article.category}</p>
                              </div>
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* Right Panel - Disposition & Notes */}
        <div className="col-span-4 flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Disposition</CardTitle>
              <CardDescription>Select the call outcome</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {dispositions.map((disp) => (
                  <Button
                    key={disp.id}
                    variant={selectedDisposition === disp.id ? 'default' : 'outline'}
                    className={`justify-start gap-2 h-auto py-3 ${
                      selectedDisposition === disp.id ? '' : disp.color
                    }`}
                    onClick={() => setSelectedDisposition(disp.id)}
                  >
                    <disp.icon className="h-4 w-4" />
                    {disp.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Call Notes</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Textarea
                placeholder="Enter notes about this call..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex-1 min-h-[150px] resize-none"
              />
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="schedule-callback" className="rounded" />
                  <Label htmlFor="schedule-callback" className="text-sm">
                    Schedule callback
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="send-email" className="rounded" />
                  <Label htmlFor="send-email" className="text-sm">
                    Send follow-up email
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button size="lg" className="gap-2" disabled={!selectedDisposition}>
            <CheckCircle className="h-5 w-5" />
            Submit & End Call
          </Button>
        </div>
      </div>
    </div>
  );
}
