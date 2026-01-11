'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Brain,
  MessageSquare,
  Mic,
  Sparkles,
  Zap,
  Settings,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  FileText,
} from 'lucide-react';

export default function AISettingsPage() {
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
  const [sentimentEnabled, setSentimentEnabled] = useState(true);
  const [agentAssistEnabled, setAgentAssistEnabled] = useState(true);
  const [autoSummaryEnabled, setAutoSummaryEnabled] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bot className="h-8 w-8" />
          AI Configuration
        </h1>
        <p className="text-muted-foreground">
          Configure AI-powered features for transcription, sentiment analysis, and agent assist
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Transcription</CardTitle>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-lg font-semibold">Active</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Deepgram API</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sentiment Analysis</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-lg font-semibold">Active</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Real-time analysis</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Agent Assist</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-lg font-semibold">Active</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Claude API</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">API Usage</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">$124.50</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue="transcription" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="transcription">Transcription</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="agent-assist">Agent Assist</TabsTrigger>
          <TabsTrigger value="summaries">Summaries</TabsTrigger>
          <TabsTrigger value="chatbot">Chatbot</TabsTrigger>
        </TabsList>

        {/* Transcription Settings */}
        <TabsContent value="transcription">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Speech-to-Text Transcription
              </CardTitle>
              <CardDescription>
                Configure real-time call transcription powered by Deepgram
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Transcription</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically transcribe all calls in real-time
                  </p>
                </div>
                <Switch
                  checked={transcriptionEnabled}
                  onCheckedChange={setTranscriptionEnabled}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select defaultValue="deepgram">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deepgram">Deepgram</SelectItem>
                      <SelectItem value="whisper">OpenAI Whisper</SelectItem>
                      <SelectItem value="google">Google Speech</SelectItem>
                      <SelectItem value="aws">AWS Transcribe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select defaultValue="en-US">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="en-GB">English (UK)</SelectItem>
                      <SelectItem value="es-ES">Spanish</SelectItem>
                      <SelectItem value="fr-FR">French</SelectItem>
                      <SelectItem value="de-DE">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select defaultValue="nova-2">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nova-2">Nova-2 (Recommended)</SelectItem>
                      <SelectItem value="nova">Nova</SelectItem>
                      <SelectItem value="enhanced">Enhanced</SelectItem>
                      <SelectItem value="base">Base</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Deepgram API Key</Label>
                  <Input type="password" defaultValue="••••••••••••••••" />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Advanced Options</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <Label>Punctuation</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Speaker Diarization</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Smart Formatting</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Profanity Filter</Label>
                    <Switch />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sentiment Analysis Settings */}
        <TabsContent value="sentiment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Sentiment Analysis
              </CardTitle>
              <CardDescription>
                Real-time sentiment detection during calls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Sentiment Analysis</Label>
                  <p className="text-sm text-muted-foreground">
                    Detect customer sentiment during calls
                  </p>
                </div>
                <Switch
                  checked={sentimentEnabled}
                  onCheckedChange={setSentimentEnabled}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Analysis Mode</Label>
                  <Select defaultValue="realtime">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="post-call">Post-call only</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Alert Threshold</Label>
                  <Select defaultValue="negative">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="very-negative">Very Negative Only</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                      <SelectItem value="any">Any Change</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Alert Actions</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <Label>Alert Agent on Screen</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Notify Supervisor</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Auto-escalation</Label>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Log Sentiment Events</Label>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Assist Settings */}
        <TabsContent value="agent-assist">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Agent Assist
              </CardTitle>
              <CardDescription>
                Real-time suggestions and knowledge base powered by Claude
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Agent Assist</Label>
                  <p className="text-sm text-muted-foreground">
                    Provide AI-powered suggestions during calls
                  </p>
                </div>
                <Switch
                  checked={agentAssistEnabled}
                  onCheckedChange={setAgentAssistEnabled}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>AI Provider</Label>
                  <Select defaultValue="claude">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude">Anthropic Claude</SelectItem>
                      <SelectItem value="gpt4">OpenAI GPT-4</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select defaultValue="claude-3-sonnet">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                      <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                      <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Anthropic API Key</Label>
                  <Input type="password" defaultValue="••••••••••••••••" />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Assist Features</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <Label>Real-time Suggestions</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Knowledge Base Search</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Objection Handling</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Compliance Alerts</Label>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  rows={4}
                  defaultValue="You are an AI assistant helping contact center agents. Provide helpful, accurate, and compliant suggestions based on the conversation context. Focus on helping resolve customer issues efficiently while maintaining a positive customer experience."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auto Summaries Settings */}
        <TabsContent value="summaries">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Auto Call Summaries
              </CardTitle>
              <CardDescription>
                Automatically generate call summaries and notes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Auto Summaries</Label>
                  <p className="text-sm text-muted-foreground">
                    Generate summaries at the end of each call
                  </p>
                </div>
                <Switch
                  checked={autoSummaryEnabled}
                  onCheckedChange={setAutoSummaryEnabled}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Summary Length</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brief">Brief (1-2 sentences)</SelectItem>
                      <SelectItem value="medium">Medium (3-5 sentences)</SelectItem>
                      <SelectItem value="detailed">Detailed (paragraph)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Include</Label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All call types</SelectItem>
                      <SelectItem value="inbound">Inbound only</SelectItem>
                      <SelectItem value="outbound">Outbound only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Summary Content</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <Label>Customer Intent</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Resolution Status</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Action Items</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Follow-up Required</Label>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chatbot Settings */}
        <TabsContent value="chatbot">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                AI Chatbot / Voicebot
              </CardTitle>
              <CardDescription>
                Configure conversational AI for self-service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable AI Chatbot</Label>
                  <p className="text-sm text-muted-foreground">
                    Handle basic inquiries before routing to agents
                  </p>
                </div>
                <Switch />
              </div>

              <div className="p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Chatbot Configuration</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure your AI chatbot intents, flows, and responses
                </p>
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Open Chatbot Builder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}
