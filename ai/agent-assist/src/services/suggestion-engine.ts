import OpenAI from 'openai';
import { getRedis } from '../lib/redis.js';
import { KnowledgeBaseService } from './knowledge-base.js';

export interface Suggestion {
  id: string;
  type: 'response' | 'knowledge' | 'action' | 'alert' | 'compliance';
  content: string;
  confidence: number;
  source?: string;
  context?: {
    trigger: string;
    relevantText?: string;
  };
  priority: 'low' | 'medium' | 'high';
}

export interface ConversationContext {
  callId: string;
  tenantId: string;
  agentId: string;
  recentTranscript: string;
  fullTranscript?: string;
  customerSentiment?: 'positive' | 'neutral' | 'negative';
  callMetadata?: {
    duration: number;
    leadInfo?: any;
    campaignInfo?: any;
  };
}

export class SuggestionEngine {
  private openai: OpenAI;
  private knowledgeBase: KnowledgeBaseService;
  private redis = getRedis();

  constructor(knowledgeBase: KnowledgeBaseService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.knowledgeBase = knowledgeBase;
  }

  /**
   * Generate real-time suggestions based on conversation context
   */
  async generateSuggestions(context: ConversationContext): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Run suggestion generators in parallel
    const [
      responseSuggestions,
      knowledgeSuggestions,
      actionSuggestions,
      alertSuggestions,
      complianceSuggestions,
    ] = await Promise.all([
      this.generateResponseSuggestions(context),
      this.generateKnowledgeSuggestions(context),
      this.generateActionSuggestions(context),
      this.detectAlerts(context),
      this.checkCompliance(context),
    ]);

    suggestions.push(
      ...responseSuggestions,
      ...knowledgeSuggestions,
      ...actionSuggestions,
      ...alertSuggestions,
      ...complianceSuggestions
    );

    // Cache suggestions for quick retrieval
    const cacheKey = `suggestions:${context.callId}`;
    await this.redis.setex(cacheKey, 300, JSON.stringify(suggestions)); // 5 min TTL

    return suggestions.sort((a, b) => {
      // Sort by priority then confidence
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.confidence - a.confidence;
    });
  }

  /**
   * Generate response suggestions using GPT
   */
  private async generateResponseSuggestions(
    context: ConversationContext
  ): Promise<Suggestion[]> {
    try {
      const prompt = `You are an AI assistant helping a call center agent. Based on the recent conversation, suggest 2-3 appropriate responses the agent could use.

Recent conversation:
${context.recentTranscript}

Customer sentiment: ${context.customerSentiment || 'unknown'}

Provide suggestions in JSON format:
[
  {
    "content": "suggested response text",
    "confidence": 0.0-1.0,
    "priority": "low|medium|high"
  }
]`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const response = JSON.parse(completion.choices[0].message.content || '{"suggestions": []}');
      const rawSuggestions = response.suggestions || [];

      return rawSuggestions.map((s: any, idx: number) => ({
        id: `response-${Date.now()}-${idx}`,
        type: 'response' as const,
        content: s.content,
        confidence: s.confidence || 0.8,
        priority: s.priority || 'medium',
        context: {
          trigger: 'conversation_analysis',
          relevantText: context.recentTranscript.slice(-200),
        },
      }));
    } catch (error) {
      console.error('Error generating response suggestions:', error);
      return [];
    }
  }

  /**
   * Search knowledge base for relevant articles
   */
  private async generateKnowledgeSuggestions(
    context: ConversationContext
  ): Promise<Suggestion[]> {
    try {
      // Extract key topics from recent transcript
      const articles = await this.knowledgeBase.search(
        context.tenantId,
        context.recentTranscript,
        { limit: 3 }
      );

      return articles.map((article, idx) => ({
        id: `knowledge-${Date.now()}-${idx}`,
        type: 'knowledge' as const,
        content: `Relevant article: ${article.title}\n\n${article.content.slice(0, 200)}...`,
        confidence: article.relevance || 0.75,
        source: article.id,
        priority: article.relevance && article.relevance > 0.8 ? 'high' : 'medium',
        context: {
          trigger: 'knowledge_base_search',
        },
      }));
    } catch (error) {
      console.error('Error generating knowledge suggestions:', error);
      return [];
    }
  }

  /**
   * Generate action suggestions based on conversation flow
   */
  private async generateActionSuggestions(
    context: ConversationContext
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    const lowerTranscript = context.recentTranscript.toLowerCase();

    // Detect common action triggers
    const actionPatterns = [
      {
        pattern: /(?:send|email|forward|share)/i,
        action: 'Consider sending a follow-up email to the customer',
        priority: 'medium' as const,
      },
      {
        pattern: /(?:schedule|callback|call back|appointment)/i,
        action: 'Schedule a callback or appointment',
        priority: 'high' as const,
      },
      {
        pattern: /(?:transfer|escalate|supervisor|manager)/i,
        action: 'Prepare to transfer call to supervisor',
        priority: 'high' as const,
      },
      {
        pattern: /(?:discount|refund|credit|compensation)/i,
        action: 'Check available compensation options',
        priority: 'high' as const,
      },
      {
        pattern: /(?:account|profile|information|details)/i,
        action: 'Update customer account information',
        priority: 'low' as const,
      },
    ];

    actionPatterns.forEach((pattern, idx) => {
      if (pattern.pattern.test(lowerTranscript)) {
        suggestions.push({
          id: `action-${Date.now()}-${idx}`,
          type: 'action',
          content: pattern.action,
          confidence: 0.85,
          priority: pattern.priority,
          context: {
            trigger: 'action_pattern_match',
            relevantText: context.recentTranscript.slice(-200),
          },
        });
      }
    });

    return suggestions;
  }

  /**
   * Detect alerts that require immediate attention
   */
  private async detectAlerts(context: ConversationContext): Promise<Suggestion[]> {
    const alerts: Suggestion[] = [];
    const lowerTranscript = context.recentTranscript.toLowerCase();

    // Critical escalation triggers
    const escalationTriggers = [
      'cancel',
      'lawyer',
      'lawsuit',
      'attorney',
      'sue',
      'court',
      'legal action',
    ];

    const foundTriggers = escalationTriggers.filter((trigger) =>
      lowerTranscript.includes(trigger)
    );

    if (foundTriggers.length > 0) {
      alerts.push({
        id: `alert-escalation-${Date.now()}`,
        type: 'alert',
        content: `ALERT: Escalation trigger detected - ${foundTriggers.join(', ')}`,
        confidence: 0.95,
        priority: 'high',
        context: {
          trigger: 'escalation_detected',
          relevantText: context.recentTranscript.slice(-200),
        },
      });
    }

    // Negative sentiment alert
    if (context.customerSentiment === 'negative') {
      alerts.push({
        id: `alert-sentiment-${Date.now()}`,
        type: 'alert',
        content: 'Customer sentiment is negative - consider empathy and de-escalation',
        confidence: 0.85,
        priority: 'medium',
        context: {
          trigger: 'negative_sentiment',
        },
      });
    }

    // Long call duration alert
    if (context.callMetadata?.duration && context.callMetadata.duration > 600) {
      // > 10 minutes
      alerts.push({
        id: `alert-duration-${Date.now()}`,
        type: 'alert',
        content: 'Call duration exceeds 10 minutes - consider summarizing next steps',
        confidence: 0.9,
        priority: 'low',
        context: {
          trigger: 'long_call_duration',
        },
      });
    }

    return alerts;
  }

  /**
   * Check for compliance issues
   */
  private async checkCompliance(context: ConversationContext): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    const lowerTranscript = context.recentTranscript.toLowerCase();

    // GDPR/Privacy mentions
    if (
      /(?:privacy|gdpr|data protection|personal information|delete my data)/i.test(
        lowerTranscript
      )
    ) {
      suggestions.push({
        id: `compliance-privacy-${Date.now()}`,
        type: 'compliance',
        content:
          'Privacy concern detected - ensure you follow GDPR/data protection protocols',
        confidence: 0.9,
        priority: 'high',
        context: {
          trigger: 'privacy_mention',
          relevantText: context.recentTranscript.slice(-200),
        },
      });
    }

    // Payment card information
    if (/(?:credit card|debit card|card number|cvv|expir)/i.test(lowerTranscript)) {
      suggestions.push({
        id: `compliance-pci-${Date.now()}`,
        type: 'compliance',
        content:
          'Payment information detected - DO NOT collect card details over the phone unless PCI compliant',
        confidence: 0.95,
        priority: 'high',
        context: {
          trigger: 'payment_info_mention',
          relevantText: context.recentTranscript.slice(-200),
        },
      });
    }

    // Recording consent
    if (/(?:recording|recorded|monitor)/i.test(lowerTranscript)) {
      suggestions.push({
        id: `compliance-recording-${Date.now()}`,
        type: 'compliance',
        content:
          'Customer asked about recording - confirm recording disclosure was provided',
        confidence: 0.85,
        priority: 'medium',
        context: {
          trigger: 'recording_mention',
        },
      });
    }

    return suggestions;
  }

  /**
   * Get cached suggestions for a call
   */
  async getCachedSuggestions(callId: string): Promise<Suggestion[] | null> {
    const cacheKey = `suggestions:${callId}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Generate call summary with action items
   */
  async generateCallSummary(
    fullTranscript: string,
    context: ConversationContext
  ): Promise<{
    summary: string;
    keyPoints: string[];
    actionItems: Array<{
      description: string;
      assignee?: 'agent' | 'customer' | 'system';
    }>;
    outcome: string;
  }> {
    try {
      const prompt = `Analyze this call transcript and provide a structured summary.

Transcript:
${fullTranscript}

Provide a JSON response with:
- summary: Brief 2-3 sentence summary
- keyPoints: Array of key discussion points
- actionItems: Array of follow-up actions needed
- outcome: Overall call outcome/resolution

Format as JSON.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Error generating call summary:', error);
      throw error;
    }
  }
}
