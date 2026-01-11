'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ChevronRight,
  MessageSquare,
  AlertCircle,
  Lightbulb,
  Copy,
  Check,
} from 'lucide-react';

interface ScriptSection {
  id: string;
  title: string;
  content: string;
  type: 'intro' | 'main' | 'objection' | 'closing';
  responses?: ScriptResponse[];
}

interface ScriptResponse {
  id: string;
  text: string;
  nextSection?: string;
}

interface QuickResponse {
  id: string;
  category: string;
  text: string;
}

const mockScript: ScriptSection[] = [
  {
    id: 'intro',
    title: 'Introduction',
    content:
      'Good [morning/afternoon], my name is [YOUR NAME] and I\'m calling from NexusDialer. Am I speaking with [CUSTOMER NAME]?',
    type: 'intro',
    responses: [
      { id: 'yes', text: 'Yes', nextSection: 'main' },
      { id: 'no', text: 'No / Wrong Person', nextSection: 'intro' },
      { id: 'busy', text: 'Customer is Busy', nextSection: 'intro' },
    ],
  },
  {
    id: 'main',
    title: 'Main Pitch',
    content:
      'Great! I\'m reaching out today because we noticed your company has been experiencing growth in [INDUSTRY]. We specialize in helping businesses like yours improve their [BENEFIT] by up to [PERCENTAGE]%.\n\nWe\'ve recently worked with companies similar to yours such as [COMPANY EXAMPLES] and helped them achieve [SPECIFIC RESULTS].\n\nI\'d love to take just a few minutes to understand your current challenges and see if we might be a good fit. Would you be open to a brief conversation?',
    type: 'main',
    responses: [
      { id: 'interested', text: 'Interested - Continue', nextSection: 'closing' },
      { id: 'objection', text: 'Objection Raised', nextSection: 'main' },
      { id: 'not-interested', text: 'Not Interested', nextSection: 'closing' },
    ],
  },
  {
    id: 'closing',
    title: 'Closing',
    content:
      'Excellent! Based on what you\'ve shared, I believe we can definitely help. I\'d like to schedule a more detailed demonstration where we can show you exactly how our solution addresses your specific needs.\n\nI have availability on [DATE/TIME OPTIONS]. Which works better for you?',
    type: 'closing',
    responses: [
      { id: 'scheduled', text: 'Meeting Scheduled', nextSection: 'closing' },
      { id: 'callback', text: 'Request Callback', nextSection: 'closing' },
      { id: 'declined', text: 'Not Interested', nextSection: 'closing' },
    ],
  },
];

const mockObjectionHandlers = [
  {
    id: '1',
    objection: 'Too Expensive',
    response:
      'I completely understand budget is a key consideration. Many of our clients initially had the same concern. What they found is that our solution typically pays for itself within [TIMEFRAME] through [SPECIFIC SAVINGS/BENEFITS]. Would you be open to seeing a customized ROI breakdown for your situation?',
  },
  {
    id: '2',
    objection: 'Already Have Solution',
    response:
      'That\'s great that you already have something in place! Many of our best clients came to us while using [COMPETITOR]. What they discovered is that we offer [UNIQUE DIFFERENTIATORS] that their previous solution couldn\'t provide. Would you be open to a quick comparison to see if there might be additional value we could offer?',
  },
  {
    id: '3',
    objection: 'Send Information',
    response:
      'Absolutely, I\'d be happy to send you information. To make sure I send you the most relevant materials, could I ask you 2-3 quick questions about your current situation? That way, the information I send will be tailored specifically to your needs.',
  },
  {
    id: '4',
    objection: 'Not Interested',
    response:
      'I appreciate your honesty. Before I let you go, could I ask - is the timing just not right, or is it something specific about what I\'ve mentioned that doesn\'t fit your needs? This feedback helps us improve.',
  },
  {
    id: '5',
    objection: 'Need to Talk to Decision Maker',
    response:
      'That makes perfect sense. To make the most of their time, would it be helpful if I sent you a brief overview that you could review together? Also, would it make sense for me to join that conversation, even for just 10 minutes, to answer any questions directly?',
  },
];

const mockQuickResponses: QuickResponse[] = [
  {
    id: '1',
    category: 'Acknowledgment',
    text: 'I completely understand where you\'re coming from.',
  },
  {
    id: '2',
    category: 'Acknowledgment',
    text: 'That\'s a great question, and I appreciate you asking.',
  },
  {
    id: '3',
    category: 'Value',
    text: 'Our clients typically see results within 30-60 days.',
  },
  {
    id: '4',
    category: 'Value',
    text: 'We\'ve helped over 500 companies achieve similar goals.',
  },
  {
    id: '5',
    category: 'Next Steps',
    text: 'Let me send you a calendar invite right now.',
  },
  {
    id: '6',
    category: 'Next Steps',
    text: 'I\'ll follow up via email with the details we discussed.',
  },
];

export function ScriptPanel() {
  const [currentSection, setCurrentSection] = useState<string>('intro');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currentScriptSection = mockScript.find((s) => s.id === currentSection);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSectionBadgeVariant = (type: ScriptSection['type']) => {
    switch (type) {
      case 'intro':
        return 'default';
      case 'main':
        return 'secondary';
      case 'objection':
        return 'destructive';
      case 'closing':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Call Script</CardTitle>
          {currentScriptSection && (
            <Badge variant={getSectionBadgeVariant(currentScriptSection.type)}>
              {currentScriptSection.title}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[700px] pr-4">
          <div className="space-y-6">
            {/* Current Script Section */}
            {currentScriptSection && (
              <div className="space-y-4">
                <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">{currentScriptSection.title}</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleCopy(currentScriptSection.content, currentScriptSection.id)
                      }
                    >
                      {copiedId === currentScriptSection.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {currentScriptSection.content}
                  </p>
                </div>

                {/* Response Options */}
                {currentScriptSection.responses && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Customer Response:
                    </p>
                    <div className="grid gap-2">
                      {currentScriptSection.responses.map((response) => (
                        <Button
                          key={response.id}
                          variant="outline"
                          className="justify-start"
                          onClick={() => {
                            if (response.nextSection) {
                              setCurrentSection(response.nextSection);
                            }
                          }}
                        >
                          <ChevronRight className="h-4 w-4 mr-2" />
                          {response.text}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Script Navigation */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Script Sections
              </h4>
              <div className="grid gap-2">
                {mockScript.map((section) => (
                  <Button
                    key={section.id}
                    variant={currentSection === section.id ? 'secondary' : 'ghost'}
                    className="justify-start"
                    onClick={() => setCurrentSection(section.id)}
                  >
                    {section.title}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Objection Handlers */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Objection Handlers
              </h4>
              <div className="space-y-3">
                {mockObjectionHandlers.map((objection) => (
                  <div
                    key={objection.id}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm text-destructive">
                        "{objection.objection}"
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(objection.response, objection.id)}
                      >
                        {copiedId === objection.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {objection.response}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Quick Responses */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Quick Responses
              </h4>
              <div className="space-y-2">
                {mockQuickResponses.map((response) => (
                  <div
                    key={response.id}
                    className="flex items-center justify-between border rounded-lg p-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-1 text-xs">
                        {response.category}
                      </Badge>
                      <p className="text-sm">{response.text}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(response.text, response.id)}
                    >
                      {copiedId === response.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
