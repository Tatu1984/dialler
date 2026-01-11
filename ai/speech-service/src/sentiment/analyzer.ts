export interface SentimentResult {
  overall: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  segments: Array<{
    time: number;
    score: number;
    label: 'positive' | 'neutral' | 'negative';
    text?: string;
  }>;
  emotions?: Array<{
    emotion: string;
    confidence: number;
  }>;
  alerts?: string[];
}

export class SentimentAnalyzer {
  private positiveWords: Set<string>;
  private negativeWords: Set<string>;
  private escalationTriggers: Set<string>;

  constructor() {
    // Simplified sentiment lexicons
    this.positiveWords = new Set([
      'good',
      'great',
      'excellent',
      'amazing',
      'wonderful',
      'fantastic',
      'happy',
      'satisfied',
      'pleased',
      'thank',
      'thanks',
      'appreciate',
      'perfect',
      'love',
      'best',
      'helpful',
      'awesome',
      'brilliant',
      'outstanding',
      'superb',
    ]);

    this.negativeWords = new Set([
      'bad',
      'terrible',
      'awful',
      'horrible',
      'worst',
      'hate',
      'angry',
      'frustrat',
      'disappoint',
      'upset',
      'annoyed',
      'complaint',
      'problem',
      'issue',
      'wrong',
      'error',
      'fail',
      'poor',
      'useless',
      'unacceptable',
    ]);

    this.escalationTriggers = new Set([
      'manager',
      'supervisor',
      'complaint',
      'cancel',
      'refund',
      'lawsuit',
      'lawyer',
      'attorney',
      'sue',
      'unacceptable',
      'disgusting',
      'ridiculous',
      'outrageous',
    ]);
  }

  /**
   * Analyze sentiment of a complete transcript
   */
  async analyze(
    transcript: string,
    segments?: Array<{ start: number; end: number; text: string }>
  ): Promise<SentimentResult> {
    const overallScore = this.calculateSentimentScore(transcript);
    const overall = this.scoreToLabel(overallScore);

    const sentimentSegments = segments
      ? segments.map((seg) => ({
          time: seg.start,
          score: this.calculateSentimentScore(seg.text),
          label: this.scoreToLabel(this.calculateSentimentScore(seg.text)),
          text: seg.text,
        }))
      : [];

    const emotions = this.detectEmotions(transcript);
    const alerts = this.detectAlerts(transcript);

    return {
      overall,
      score: overallScore,
      segments: sentimentSegments,
      emotions,
      alerts: alerts.length > 0 ? alerts : undefined,
    };
  }

  /**
   * Analyze sentiment in real-time for streaming transcripts
   */
  async analyzeSegment(text: string, timestamp: number): Promise<SentimentResult['segments'][0]> {
    const score = this.calculateSentimentScore(text);
    return {
      time: timestamp,
      score,
      label: this.scoreToLabel(score),
      text,
    };
  }

  private calculateSentimentScore(text: string): number {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/);

    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach((word) => {
      if (this.positiveWords.has(word)) {
        positiveCount++;
      }
      // Check if negative word or contains negative prefix
      if (this.negativeWords.has(word) || Array.from(this.negativeWords).some((neg) => word.includes(neg))) {
        negativeCount++;
      }
    });

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) {
      return 0; // Neutral
    }

    // Score from -1 to 1
    const score = (positiveCount - negativeCount) / Math.max(totalSentimentWords, words.length / 10);
    return Math.max(-1, Math.min(1, score));
  }

  private scoreToLabel(score: number): 'positive' | 'neutral' | 'negative' {
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  }

  private detectEmotions(text: string): Array<{ emotion: string; confidence: number }> {
    const emotions: Array<{ emotion: string; confidence: number }> = [];
    const lowerText = text.toLowerCase();

    // Simple emotion detection patterns
    const emotionPatterns = [
      {
        emotion: 'joy',
        patterns: ['happy', 'excited', 'delighted', 'thrilled'],
        weight: 1,
      },
      {
        emotion: 'anger',
        patterns: ['angry', 'furious', 'outraged', 'mad'],
        weight: 1,
      },
      {
        emotion: 'frustration',
        patterns: ['frustrated', 'annoyed', 'irritated'],
        weight: 1,
      },
      {
        emotion: 'satisfaction',
        patterns: ['satisfied', 'pleased', 'content'],
        weight: 1,
      },
      {
        emotion: 'disappointment',
        patterns: ['disappointed', 'let down', 'upset'],
        weight: 1,
      },
      {
        emotion: 'confusion',
        patterns: ['confused', 'unclear', "don't understand"],
        weight: 0.8,
      },
    ];

    emotionPatterns.forEach(({ emotion, patterns, weight }) => {
      const matches = patterns.filter((pattern) => lowerText.includes(pattern)).length;
      if (matches > 0) {
        emotions.push({
          emotion,
          confidence: Math.min(0.95, (matches / patterns.length) * weight),
        });
      }
    });

    return emotions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  private detectAlerts(text: string): string[] {
    const alerts: string[] = [];
    const lowerText = text.toLowerCase();

    // Check for escalation triggers
    const foundTriggers = Array.from(this.escalationTriggers).filter((trigger) =>
      lowerText.includes(trigger)
    );

    if (foundTriggers.length > 0) {
      alerts.push(`Escalation trigger detected: ${foundTriggers.join(', ')}`);
    }

    // Check for very negative sentiment
    const score = this.calculateSentimentScore(text);
    if (score < -0.5) {
      alerts.push('High negative sentiment detected');
    }

    // Check for profanity (simplified)
    const profanityPatterns = ['damn', 'hell', 'crap', 'stupid', 'idiot'];
    const foundProfanity = profanityPatterns.some((word) => lowerText.includes(word));
    if (foundProfanity) {
      alerts.push('Potential profanity detected');
    }

    // Check for compliance concerns
    const compliancePatterns = ['record', 'recording', 'privacy', 'gdpr', 'legal'];
    const foundCompliance = compliancePatterns.some((word) => lowerText.includes(word));
    if (foundCompliance) {
      alerts.push('Compliance-related topic mentioned');
    }

    return alerts;
  }

  /**
   * Get sentiment trend over time
   */
  analyzeTrend(segments: Array<{ time: number; score: number }>): {
    trend: 'improving' | 'declining' | 'stable';
    volatility: number;
  } {
    if (segments.length < 3) {
      return { trend: 'stable', volatility: 0 };
    }

    const scores = segments.map((s) => s.score);
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;

    let trend: 'improving' | 'declining' | 'stable';
    if (difference > 0.15) {
      trend = 'improving';
    } else if (difference < -0.15) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    // Calculate volatility (standard deviation)
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const volatility = Math.sqrt(variance);

    return { trend, volatility };
  }
}
