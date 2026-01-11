import type { Logger } from 'pino';

interface SentimentResult {
  score: number; // -1 to 1, negative to positive
  magnitude: number; // 0 to 1, intensity
  label: 'positive' | 'negative' | 'neutral' | 'mixed';
  emotions: {
    anger: number;
    frustration: number;
    satisfaction: number;
    confusion: number;
    excitement: number;
  };
  keywords: string[];
  escalationRisk: 'low' | 'medium' | 'high';
}

export class SentimentAnalyzer {
  private logger: Logger;

  // Simple keyword-based analysis (replace with ML model in production)
  private positiveKeywords = [
    'thank', 'great', 'excellent', 'perfect', 'wonderful', 'appreciate',
    'helpful', 'fantastic', 'amazing', 'love', 'happy', 'satisfied',
    'resolved', 'fixed', 'works', 'understand', 'clear'
  ];

  private negativeKeywords = [
    'angry', 'frustrated', 'terrible', 'awful', 'horrible', 'worst',
    'disappointed', 'unacceptable', 'ridiculous', 'cancel', 'refund',
    'complaint', 'manager', 'supervisor', 'lawyer', 'sue', 'never again'
  ];

  private escalationKeywords = [
    'manager', 'supervisor', 'escalate', 'complaint', 'lawyer',
    'sue', 'unacceptable', 'cancel', 'never again', 'report',
    'bbb', 'attorney'
  ];

  constructor(logger: Logger) {
    this.logger = logger.child({ component: 'SentimentAnalyzer' });
  }

  async analyze(text: string, callId: string): Promise<SentimentResult> {
    const startTime = Date.now();
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);

    // Count keywords
    let positiveCount = 0;
    let negativeCount = 0;
    const foundKeywords: string[] = [];

    for (const word of words) {
      if (this.positiveKeywords.some(kw => word.includes(kw))) {
        positiveCount++;
        foundKeywords.push(word);
      }
      if (this.negativeKeywords.some(kw => word.includes(kw))) {
        negativeCount++;
        foundKeywords.push(word);
      }
    }

    // Calculate score
    const total = positiveCount + negativeCount || 1;
    const score = (positiveCount - negativeCount) / total;

    // Determine label
    let label: SentimentResult['label'];
    if (positiveCount > 0 && negativeCount > 0) {
      label = 'mixed';
    } else if (score > 0.2) {
      label = 'positive';
    } else if (score < -0.2) {
      label = 'negative';
    } else {
      label = 'neutral';
    }

    // Check escalation risk
    const escalationMatches = this.escalationKeywords.filter(kw =>
      lowerText.includes(kw)
    ).length;

    let escalationRisk: SentimentResult['escalationRisk'];
    if (escalationMatches >= 2 || (negativeCount >= 3 && escalationMatches >= 1)) {
      escalationRisk = 'high';
    } else if (escalationMatches >= 1 || negativeCount >= 2) {
      escalationRisk = 'medium';
    } else {
      escalationRisk = 'low';
    }

    // Calculate emotion scores (simplified)
    const emotions = {
      anger: Math.min(negativeCount * 0.2, 1),
      frustration: this.containsAny(lowerText, ['frustrated', 'waiting', 'again', 'still']) ? 0.7 : 0.1,
      satisfaction: positiveCount > 2 ? 0.8 : positiveCount > 0 ? 0.4 : 0.1,
      confusion: this.containsAny(lowerText, ['confused', 'understand', 'what', 'how', 'why']) ? 0.5 : 0.1,
      excitement: this.containsAny(lowerText, ['excited', 'amazing', 'fantastic', 'great']) ? 0.8 : 0.2,
    };

    const result: SentimentResult = {
      score: Math.max(-1, Math.min(1, score)),
      magnitude: Math.min(1, (positiveCount + negativeCount) * 0.15),
      label,
      emotions,
      keywords: foundKeywords.slice(0, 10),
      escalationRisk,
    };

    this.logger.debug({
      callId,
      duration: Date.now() - startTime,
      result: { score: result.score, label: result.label, escalationRisk: result.escalationRisk }
    }, 'Sentiment analysis complete');

    return result;
  }

  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(kw => text.includes(kw));
  }

  // Real-time sentiment tracking for a call
  createCallTracker(callId: string): CallSentimentTracker {
    return new CallSentimentTracker(callId, this, this.logger);
  }
}

export class CallSentimentTracker {
  private callId: string;
  private analyzer: SentimentAnalyzer;
  private logger: Logger;
  private history: SentimentResult[] = [];
  private overallScore = 0;

  constructor(callId: string, analyzer: SentimentAnalyzer, logger: Logger) {
    this.callId = callId;
    this.analyzer = analyzer;
    this.logger = logger;
  }

  async addUtterance(text: string): Promise<SentimentResult> {
    const result = await this.analyzer.analyze(text, this.callId);
    this.history.push(result);

    // Calculate running average
    this.overallScore = this.history.reduce((sum, r) => sum + r.score, 0) / this.history.length;

    return result;
  }

  getOverallSentiment(): {
    score: number;
    trend: 'improving' | 'declining' | 'stable';
    riskLevel: 'low' | 'medium' | 'high';
  } {
    // Calculate trend from last 5 utterances
    const recent = this.history.slice(-5);
    let trend: 'improving' | 'declining' | 'stable' = 'stable';

    if (recent.length >= 3) {
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
      const secondHalf = recent.slice(Math.floor(recent.length / 2));

      const firstAvg = firstHalf.reduce((s, r) => s + r.score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, r) => s + r.score, 0) / secondHalf.length;

      if (secondAvg - firstAvg > 0.1) {
        trend = 'improving';
      } else if (firstAvg - secondAvg > 0.1) {
        trend = 'declining';
      }
    }

    // Determine risk level
    const highRiskCount = this.history.filter(r => r.escalationRisk === 'high').length;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (highRiskCount >= 2 || this.overallScore < -0.5) {
      riskLevel = 'high';
    } else if (highRiskCount >= 1 || this.overallScore < -0.2) {
      riskLevel = 'medium';
    }

    return {
      score: this.overallScore,
      trend,
      riskLevel,
    };
  }

  getHistory(): SentimentResult[] {
    return this.history;
  }
}
