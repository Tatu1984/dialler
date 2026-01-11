import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { SuggestionEngine, type ConversationContext } from '../services/suggestion-engine.js';
import { KnowledgeBaseService } from '../services/knowledge-base.js';
import { eq, and } from 'drizzle-orm';
import { agentAssistEvents, type NewAgentAssistEvent } from '@nexusdialer/database';
import { publishEvent } from '../lib/kafka.js';
import { v4 as uuidv4 } from 'crypto';

const generateSuggestionsSchema = z.object({
  callId: z.string().uuid(),
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
  recentTranscript: z.string(),
  fullTranscript: z.string().optional(),
  customerSentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  callMetadata: z
    .object({
      duration: z.number(),
      leadInfo: z.any().optional(),
      campaignInfo: z.any().optional(),
    })
    .optional(),
});

const searchKnowledgeSchema = z.object({
  tenantId: z.string().uuid(),
  query: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().optional(),
  minScore: z.number().optional(),
});

const createArticleSchema = z.object({
  tenantId: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  createdBy: z.string().uuid().optional(),
});

const updateArticleSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

const feedbackSchema = z.object({
  suggestionId: z.string().uuid(),
  accepted: z.boolean(),
  feedback: z.string().optional(),
});

const generateSummarySchema = z.object({
  callId: z.string().uuid(),
  tenantId: z.string().uuid(),
  fullTranscript: z.string(),
  agentId: z.string().uuid().optional(),
});

export default async function assistRoutes(fastify: FastifyInstance) {
  const knowledgeBase = new KnowledgeBaseService();
  const suggestionEngine = new SuggestionEngine(knowledgeBase);

  /**
   * Generate real-time suggestions
   */
  fastify.post(
    '/suggestions',
    async (
      request: FastifyRequest<{
        Body: z.infer<typeof generateSuggestionsSchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const data = generateSuggestionsSchema.parse(request.body);

        const context: ConversationContext = {
          callId: data.callId,
          tenantId: data.tenantId,
          agentId: data.agentId,
          recentTranscript: data.recentTranscript,
          fullTranscript: data.fullTranscript,
          customerSentiment: data.customerSentiment,
          callMetadata: data.callMetadata,
        };

        const suggestions = await suggestionEngine.generateSuggestions(context);

        // Log suggestion events
        for (const suggestion of suggestions) {
          await fastify.db.insert(agentAssistEvents).values({
            tenantId: data.tenantId,
            callId: data.callId,
            agentId: data.agentId,
            eventType: suggestion.type,
            content: {
              suggestionId: suggestion.id,
              content: suggestion.content,
              confidence: suggestion.confidence,
              priority: suggestion.priority,
            } as any,
            shownAt: new Date(),
          });

          // Publish event
          await publishEvent('ai-events', {
            eventId: uuidv4(),
            tenantId: data.tenantId,
            timestamp: new Date().toISOString(),
            version: '1.0',
            type: 'ai.suggestion-generated',
            payload: {
              callId: data.callId,
              agentId: data.agentId,
              suggestionId: suggestion.id,
              type: suggestion.type,
              content: suggestion.content,
              confidence: suggestion.confidence,
              source: suggestion.source,
              context: suggestion.context,
              priority: suggestion.priority,
            },
          });
        }

        return reply.send({ suggestions });
      } catch (error) {
        fastify.log.error('Generate suggestions error:', error);
        return reply.status(500).send({
          error: 'Failed to generate suggestions',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Get cached suggestions
   */
  fastify.get(
    '/suggestions/:callId',
    async (
      request: FastifyRequest<{
        Params: { callId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { callId } = request.params;
        const suggestions = await suggestionEngine.getCachedSuggestions(callId);

        if (!suggestions) {
          return reply.status(404).send({ error: 'No suggestions found for this call' });
        }

        return reply.send({ suggestions });
      } catch (error) {
        fastify.log.error('Get cached suggestions error:', error);
        return reply.status(500).send({ error: 'Failed to retrieve suggestions' });
      }
    }
  );

  /**
   * Submit feedback on suggestion
   */
  fastify.post(
    '/suggestions/:id/feedback',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof feedbackSchema> & { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const data = feedbackSchema.extend({ tenantId: z.string().uuid() }).parse(request.body);

        // Find the assist event
        const [event] = await fastify.db
          .select()
          .from(agentAssistEvents)
          .where(
            and(
              eq(agentAssistEvents.tenantId, data.tenantId),
              // @ts-ignore
              `content->>'suggestionId' = '${data.suggestionId}'`
            )
          )
          .limit(1);

        if (!event) {
          return reply.status(404).send({ error: 'Suggestion event not found' });
        }

        // Update with feedback
        await fastify.db
          .update(agentAssistEvents)
          .set({
            accepted: data.accepted ? 1 : 0,
            feedback: data.feedback || null,
          })
          .where(eq(agentAssistEvents.id, event.id));

        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error('Submit feedback error:', error);
        return reply.status(500).send({ error: 'Failed to submit feedback' });
      }
    }
  );

  /**
   * Generate call summary
   */
  fastify.post(
    '/summary',
    async (
      request: FastifyRequest<{
        Body: z.infer<typeof generateSummarySchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const data = generateSummarySchema.parse(request.body);

        const context: ConversationContext = {
          callId: data.callId,
          tenantId: data.tenantId,
          agentId: data.agentId || uuidv4(),
          recentTranscript: data.fullTranscript,
          fullTranscript: data.fullTranscript,
        };

        const summary = await suggestionEngine.generateCallSummary(
          data.fullTranscript,
          context
        );

        // Publish summary event
        await publishEvent('ai-events', {
          eventId: uuidv4(),
          tenantId: data.tenantId,
          timestamp: new Date().toISOString(),
          version: '1.0',
          type: 'ai.summary-ready',
          payload: {
            callId: data.callId,
            summary: summary.summary,
            keyPoints: summary.keyPoints,
            actionItems: summary.actionItems,
            topics: [],
            outcome: summary.outcome,
            processingTime: 0,
          },
        });

        return reply.send({ summary });
      } catch (error) {
        fastify.log.error('Generate summary error:', error);
        return reply.status(500).send({
          error: 'Failed to generate summary',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Search knowledge base
   */
  fastify.post(
    '/knowledge/search',
    async (
      request: FastifyRequest<{
        Body: z.infer<typeof searchKnowledgeSchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const data = searchKnowledgeSchema.parse(request.body);

        const articles = await knowledgeBase.search(data.tenantId, data.query, {
          limit: data.limit,
          category: data.category,
          tags: data.tags,
          minScore: data.minScore,
        });

        return reply.send({ articles });
      } catch (error) {
        fastify.log.error('Search knowledge base error:', error);
        return reply.status(500).send({ error: 'Failed to search knowledge base' });
      }
    }
  );

  /**
   * Create knowledge article
   */
  fastify.post(
    '/knowledge',
    async (
      request: FastifyRequest<{
        Body: z.infer<typeof createArticleSchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const data = createArticleSchema.parse(request.body);

        const article = await knowledgeBase.createArticle(data);

        return reply.status(201).send({ article });
      } catch (error) {
        fastify.log.error('Create knowledge article error:', error);
        return reply.status(500).send({
          error: 'Failed to create article',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Get knowledge article by ID
   */
  fastify.get(
    '/knowledge/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const { tenantId } = request.query;

        if (!tenantId) {
          return reply.status(400).send({ error: 'tenantId is required' });
        }

        const article = await knowledgeBase.getById(id, tenantId);

        if (!article) {
          return reply.status(404).send({ error: 'Article not found' });
        }

        return reply.send({ article });
      } catch (error) {
        fastify.log.error('Get knowledge article error:', error);
        return reply.status(500).send({ error: 'Failed to get article' });
      }
    }
  );

  /**
   * Update knowledge article
   */
  fastify.patch(
    '/knowledge/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof updateArticleSchema> & { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const data = updateArticleSchema.extend({ tenantId: z.string().uuid() }).parse(request.body);

        const article = await knowledgeBase.updateArticle(id, data.tenantId, data);

        if (!article) {
          return reply.status(404).send({ error: 'Article not found' });
        }

        return reply.send({ article });
      } catch (error) {
        fastify.log.error('Update knowledge article error:', error);
        return reply.status(500).send({ error: 'Failed to update article' });
      }
    }
  );

  /**
   * Delete knowledge article
   */
  fastify.delete(
    '/knowledge/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const { tenantId } = request.query;

        if (!tenantId) {
          return reply.status(400).send({ error: 'tenantId is required' });
        }

        const success = await knowledgeBase.deleteArticle(id, tenantId);

        if (!success) {
          return reply.status(404).send({ error: 'Article not found' });
        }

        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error('Delete knowledge article error:', error);
        return reply.status(500).send({ error: 'Failed to delete article' });
      }
    }
  );

  /**
   * Get all knowledge articles for tenant
   */
  fastify.get(
    '/knowledge',
    async (
      request: FastifyRequest<{
        Querystring: {
          tenantId: string;
          limit?: number;
          offset?: number;
          category?: string;
          status?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId, limit, offset, category, status } = request.query;

        if (!tenantId) {
          return reply.status(400).send({ error: 'tenantId is required' });
        }

        const articles = await knowledgeBase.getByTenant(tenantId, {
          limit: limit ? parseInt(limit.toString()) : undefined,
          offset: offset ? parseInt(offset.toString()) : undefined,
          category,
          status,
        });

        return reply.send({ articles, count: articles.length });
      } catch (error) {
        fastify.log.error('Get knowledge articles error:', error);
        return reply.status(500).send({ error: 'Failed to get articles' });
      }
    }
  );

  /**
   * Get popular knowledge articles
   */
  fastify.get(
    '/knowledge/popular',
    async (
      request: FastifyRequest<{
        Querystring: {
          tenantId: string;
          limit?: number;
          category?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId, limit, category } = request.query;

        if (!tenantId) {
          return reply.status(400).send({ error: 'tenantId is required' });
        }

        const articles = await knowledgeBase.getPopular(tenantId, {
          limit: limit ? parseInt(limit.toString()) : undefined,
          category,
        });

        return reply.send({ articles });
      } catch (error) {
        fastify.log.error('Get popular articles error:', error);
        return reply.status(500).send({ error: 'Failed to get popular articles' });
      }
    }
  );

  /**
   * Mark article as helpful
   */
  fastify.post(
    '/knowledge/:id/helpful',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const { tenantId } = request.body;

        await knowledgeBase.markAsHelpful(id, tenantId);

        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error('Mark as helpful error:', error);
        return reply.status(500).send({ error: 'Failed to mark as helpful' });
      }
    }
  );

  /**
   * Get assist analytics
   */
  fastify.get(
    '/analytics',
    async (
      request: FastifyRequest<{
        Querystring: {
          tenantId: string;
          dateFrom?: string;
          dateTo?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId, dateFrom, dateTo } = request.query;

        if (!tenantId) {
          return reply.status(400).send({ error: 'tenantId is required' });
        }

        // Get suggestion statistics
        let query = `
          SELECT
            event_type,
            COUNT(*) as total,
            SUM(CASE WHEN accepted = 1 THEN 1 ELSE 0 END) as accepted,
            SUM(CASE WHEN accepted = 0 THEN 1 ELSE 0 END) as rejected,
            SUM(CASE WHEN accepted IS NULL THEN 1 ELSE 0 END) as no_action,
            AVG(CASE WHEN accepted = 1 THEN 1.0 ELSE 0.0 END) as acceptance_rate
          FROM agent_assist_events
          WHERE tenant_id = $1
        `;

        const params: any[] = [tenantId];

        if (dateFrom) {
          params.push(dateFrom);
          query += ` AND shown_at >= $${params.length}`;
        }

        if (dateTo) {
          params.push(dateTo);
          query += ` AND shown_at <= $${params.length}`;
        }

        query += ' GROUP BY event_type';

        const result = await fastify.db.execute(query, params) as any;

        return reply.send({
          analytics: result.rows || result,
        });
      } catch (error) {
        fastify.log.error('Get analytics error:', error);
        return reply.status(500).send({ error: 'Failed to get analytics' });
      }
    }
  );
}
