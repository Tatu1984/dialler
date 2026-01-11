import type { Logger } from 'pino';

interface Suggestion {
  id: string;
  type: 'response' | 'action' | 'knowledge' | 'escalation' | 'upsell';
  content: string;
  confidence: number;
  context?: string;
}

interface AgentAssistContext {
  callId?: string;
  campaignType?: string;
  customerHistory?: any;
  currentIssue?: string;
  previousSuggestions?: string[];
}

export class AgentAssist {
  private logger: Logger;

  // Knowledge base categories and responses
  private knowledgeBase: Map<string, string[]> = new Map([
    ['billing', [
      'I can help you with your billing inquiry. Let me pull up your account details.',
      'For billing disputes, I can submit a review request that typically resolves within 3-5 business days.',
      'Would you like me to explain the charges on your recent statement?',
    ]],
    ['technical', [
      'Have you tried restarting the device? This often resolves connectivity issues.',
      'I can run a diagnostic test from here. This will take about 30 seconds.',
      'Let me check if there are any service outages in your area.',
    ]],
    ['cancellation', [
      'I understand you\'re considering cancellation. May I ask what prompted this decision?',
      'Before we proceed, I\'d like to share some options that might address your concerns.',
      'We have a loyalty program that could provide significant savings. Would you like to hear about it?',
    ]],
    ['complaint', [
      'I sincerely apologize for the inconvenience you\'ve experienced.',
      'Your feedback is important to us. Let me document this and ensure it reaches the appropriate team.',
      'I want to make this right for you. Here\'s what I can do...',
    ]],
    ['general', [
      'How can I assist you further today?',
      'Is there anything else I can help you with?',
      'I\'m here to help. What questions do you have?',
    ]],
  ]);

  // Action triggers based on keywords
  private actionTriggers: Map<string, Suggestion> = new Map([
    ['refund', {
      id: 'action-refund',
      type: 'action',
      content: 'Customer mentioned refund. Check refund eligibility in account section.',
      confidence: 0.9,
    }],
    ['manager', {
      id: 'action-escalate',
      type: 'escalation',
      content: 'Customer requesting manager. Consider warm transfer to supervisor.',
      confidence: 0.95,
    }],
    ['cancel', {
      id: 'action-retention',
      type: 'action',
      content: 'Cancellation intent detected. Review retention offers before proceeding.',
      confidence: 0.85,
    }],
    ['upgrade', {
      id: 'action-upsell',
      type: 'upsell',
      content: 'Customer interested in upgrade. Present available plan options.',
      confidence: 0.8,
    }],
  ]);

  constructor(logger: Logger) {
    this.logger = logger.child({ component: 'AgentAssist' });
  }

  async getSuggestions(
    transcript: string,
    context: AgentAssistContext,
    callId: string
  ): Promise<Suggestion[]> {
    const startTime = Date.now();
    const suggestions: Suggestion[] = [];
    const lowerTranscript = transcript.toLowerCase();

    // Check for action triggers
    for (const [trigger, suggestion] of this.actionTriggers) {
      if (lowerTranscript.includes(trigger)) {
        suggestions.push({
          ...suggestion,
          id: `${suggestion.id}-${Date.now()}`,
        });
      }
    }

    // Identify topic and get knowledge base suggestions
    const topic = this.identifyTopic(lowerTranscript);
    const kbResponses = this.knowledgeBase.get(topic) || this.knowledgeBase.get('general')!;

    // Add top 2 KB suggestions
    kbResponses.slice(0, 2).forEach((content, idx) => {
      suggestions.push({
        id: `kb-${topic}-${idx}-${Date.now()}`,
        type: 'response',
        content,
        confidence: 0.75 - (idx * 0.1),
        context: topic,
      });
    });

    // Add contextual suggestions based on sentiment
    if (this.detectNegativeSentiment(lowerTranscript)) {
      suggestions.push({
        id: `empathy-${Date.now()}`,
        type: 'response',
        content: 'I understand this is frustrating. Let me see what I can do to resolve this for you.',
        confidence: 0.85,
        context: 'empathy',
      });
    }

    // Sort by confidence and limit
    suggestions.sort((a, b) => b.confidence - a.confidence);
    const topSuggestions = suggestions.slice(0, 5);

    this.logger.debug({
      callId,
      duration: Date.now() - startTime,
      suggestionCount: topSuggestions.length,
      topic,
    }, 'Generated agent assist suggestions');

    return topSuggestions;
  }

  private identifyTopic(text: string): string {
    const topicKeywords: Record<string, string[]> = {
      billing: ['bill', 'charge', 'payment', 'invoice', 'price', 'cost', 'fee'],
      technical: ['error', 'not working', 'broken', 'slow', 'issue', 'problem', 'help'],
      cancellation: ['cancel', 'stop', 'end', 'terminate', 'close'],
      complaint: ['complaint', 'unhappy', 'disappointed', 'terrible', 'worst', 'angry'],
    };

    let bestMatch = 'general';
    let maxMatches = 0;

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const matches = keywords.filter(kw => text.includes(kw)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = topic;
      }
    }

    return bestMatch;
  }

  private detectNegativeSentiment(text: string): boolean {
    const negativeIndicators = [
      'frustrated', 'angry', 'upset', 'disappointed',
      'unacceptable', 'ridiculous', 'terrible', 'awful'
    ];
    return negativeIndicators.some(indicator => text.includes(indicator));
  }

  // Get contextual script for specific scenario
  getScript(scenario: string): string[] {
    const scripts: Record<string, string[]> = {
      opening: [
        'Thank you for calling [Company Name], my name is [Agent]. How may I assist you today?',
        'Hello, thank you for contacting us. My name is [Agent]. How can I help?',
      ],
      verification: [
        'For security purposes, may I have your account number or the phone number on the account?',
        'To access your account, could you please verify your date of birth and last four digits of your SSN?',
      ],
      closing: [
        'Is there anything else I can help you with today?',
        'Thank you for calling. Have a great day!',
        'I\'m glad I could help. Please don\'t hesitate to call if you have any other questions.',
      ],
      holdRequest: [
        'May I place you on a brief hold while I look into this?',
        'I\'ll need to check on a few things. Would you mind holding for about [X] minutes?',
      ],
    };

    return scripts[scenario] || scripts.closing;
  }
}
