import { eq, and, desc } from 'drizzle-orm';
import { getDb, transcriptions, type NewTranscription, type Transcription } from '@nexusdialer/database';
import { publishEvent } from '../lib/kafka.js';
import { v4 as uuidv4 } from 'crypto';

export class TranscriptService {
  private db = getDb();

  /**
   * Create a new transcription record
   */
  async create(data: Omit<NewTranscription, 'id' | 'createdAt'>): Promise<Transcription> {
    const [transcription] = await this.db
      .insert(transcriptions)
      .values({
        ...data,
        id: uuidv4(),
      })
      .returning();

    // Publish transcription-ready event
    await publishEvent('ai-events', {
      eventId: uuidv4(),
      tenantId: data.tenantId,
      timestamp: new Date().toISOString(),
      version: '1.0',
      type: 'ai.transcription-ready',
      payload: {
        callId: data.callId,
        transcriptionId: transcription.id,
        content: data.content,
        speakers: data.speakers as any,
        keywords: data.keywords as any,
        language: data.language || 'en-US',
        confidence: parseFloat(data.confidence || '0'),
        processingTime: data.processingTime || 0,
      },
    });

    return transcription;
  }

  /**
   * Get transcription by ID
   */
  async getById(id: string, tenantId: string): Promise<Transcription | null> {
    const [transcription] = await this.db
      .select()
      .from(transcriptions)
      .where(and(eq(transcriptions.id, id), eq(transcriptions.tenantId, tenantId)))
      .limit(1);

    return transcription || null;
  }

  /**
   * Get transcription by call ID
   */
  async getByCallId(callId: string, tenantId: string): Promise<Transcription | null> {
    const [transcription] = await this.db
      .select()
      .from(transcriptions)
      .where(and(eq(transcriptions.callId, callId), eq(transcriptions.tenantId, tenantId)))
      .orderBy(desc(transcriptions.createdAt))
      .limit(1);

    return transcription || null;
  }

  /**
   * Get all transcriptions for a tenant
   */
  async getByTenant(
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Transcription[]> {
    const { limit = 50, offset = 0 } = options;

    return await this.db
      .select()
      .from(transcriptions)
      .where(eq(transcriptions.tenantId, tenantId))
      .orderBy(desc(transcriptions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Update transcription sentiment
   */
  async updateSentiment(
    id: string,
    tenantId: string,
    sentiment: any
  ): Promise<Transcription | null> {
    const [updated] = await this.db
      .update(transcriptions)
      .set({ sentiment })
      .where(and(eq(transcriptions.id, id), eq(transcriptions.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return null;
    }

    // Publish sentiment-analyzed event
    const transcription = await this.getById(id, tenantId);
    if (transcription) {
      await publishEvent('ai-events', {
        eventId: uuidv4(),
        tenantId,
        timestamp: new Date().toISOString(),
        version: '1.0',
        type: 'ai.sentiment-analyzed',
        payload: {
          callId: transcription.callId,
          overall: sentiment.overall,
          score: sentiment.score,
          segments: sentiment.segments || [],
          emotions: sentiment.emotions,
          alerts: sentiment.alerts,
        },
      });
    }

    return updated;
  }

  /**
   * Search transcriptions by content
   */
  async search(
    tenantId: string,
    query: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Transcription[]> {
    const { limit = 50, offset = 0 } = options;

    // Note: This uses basic LIKE search. For production, use PostgreSQL full-text search
    // or a dedicated search engine like Elasticsearch
    return await this.db.execute(
      `
      SELECT * FROM transcriptions
      WHERE tenant_id = $1
        AND content ILIKE $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `,
      [tenantId, `%${query}%`, limit, offset]
    ) as any;
  }

  /**
   * Get transcriptions with specific keywords
   */
  async getByKeywords(
    tenantId: string,
    keywords: string[],
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Transcription[]> {
    const { limit = 50, offset = 0 } = options;

    // Use JSONB contains operator
    return await this.db.execute(
      `
      SELECT * FROM transcriptions
      WHERE tenant_id = $1
        AND keywords @> $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `,
      [tenantId, JSON.stringify(keywords), limit, offset]
    ) as any;
  }

  /**
   * Get sentiment statistics for a tenant
   */
  async getSentimentStats(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    averageScore: number;
  }> {
    let query = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN (sentiment->>'overall') = 'positive' THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN (sentiment->>'overall') = 'neutral' THEN 1 ELSE 0 END) as neutral,
        SUM(CASE WHEN (sentiment->>'overall') = 'negative' THEN 1 ELSE 0 END) as negative,
        AVG((sentiment->>'score')::float) as average_score
      FROM transcriptions
      WHERE tenant_id = $1
    `;

    const params: any[] = [tenantId];

    if (dateFrom) {
      params.push(dateFrom.toISOString());
      query += ` AND created_at >= $${params.length}`;
    }

    if (dateTo) {
      params.push(dateTo.toISOString());
      query += ` AND created_at <= $${params.length}`;
    }

    const result = await this.db.execute(query, params) as any;
    const row = result.rows?.[0] || result[0];

    return {
      total: parseInt(row.total || '0'),
      positive: parseInt(row.positive || '0'),
      neutral: parseInt(row.neutral || '0'),
      negative: parseInt(row.negative || '0'),
      averageScore: parseFloat(row.average_score || '0'),
    };
  }

  /**
   * Delete old transcriptions (for cleanup/GDPR compliance)
   */
  async deleteOlderThan(tenantId: string, date: Date): Promise<number> {
    const result = await this.db
      .delete(transcriptions)
      .where(
        and(
          eq(transcriptions.tenantId, tenantId),
          // @ts-ignore
          `created_at < '${date.toISOString()}'`
        )
      );

    return result.rowCount || 0;
  }
}
