import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { TranscriptService } from '../services/transcript-service.js';
import { GoogleBatchTranscriber, WhisperBatchTranscriber } from '../transcription/batch.js';
import { SentimentAnalyzer } from '../sentiment/analyzer.js';

const createTranscriptionSchema = z.object({
  callId: z.string().uuid(),
  tenantId: z.string().uuid(),
  audioUrl: z.string().url().optional(),
  audioFilePath: z.string().optional(),
  languageCode: z.string().optional(),
  enableSpeakerDiarization: z.boolean().optional(),
  provider: z.enum(['google', 'whisper']).optional(),
});

const searchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

const sentimentStatsSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export default async function transcriptionRoutes(fastify: FastifyInstance) {
  const transcriptService = new TranscriptService();
  const sentimentAnalyzer = new SentimentAnalyzer();

  /**
   * Create batch transcription job
   */
  fastify.post(
    '/batch',
    async (
      request: FastifyRequest<{
        Body: z.infer<typeof createTranscriptionSchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const data = createTranscriptionSchema.parse(request.body);

        if (!data.audioUrl && !data.audioFilePath) {
          return reply.status(400).send({
            error: 'Either audioUrl or audioFilePath must be provided',
          });
        }

        const provider = data.provider || 'google';
        let result;

        const startTime = Date.now();

        if (provider === 'google') {
          const transcriber = new GoogleBatchTranscriber();

          if (data.audioUrl) {
            result = await transcriber.transcribeUrl(data.audioUrl, {
              languageCode: data.languageCode,
              enableSpeakerDiarization: data.enableSpeakerDiarization,
            });
          } else if (data.audioFilePath) {
            result = await transcriber.transcribeFile(data.audioFilePath, {
              languageCode: data.languageCode,
              enableSpeakerDiarization: data.enableSpeakerDiarization,
            });
          }
        } else {
          const transcriber = new WhisperBatchTranscriber();

          if (data.audioFilePath) {
            result = await transcriber.transcribeFile(data.audioFilePath, {
              languageCode: data.languageCode,
            });
          } else {
            return reply.status(400).send({
              error: 'Whisper only supports file-based transcription',
            });
          }
        }

        if (!result) {
          return reply.status(500).send({
            error: 'Transcription failed',
          });
        }

        // Analyze sentiment
        const sentiment = await sentimentAnalyzer.analyze(
          result.content,
          result.speakers.flatMap((s) => s.segments)
        );

        // Save to database
        const transcription = await transcriptService.create({
          tenantId: data.tenantId,
          callId: data.callId,
          content: result.content,
          speakers: result.speakers as any,
          keywords: result.keywords as any,
          sentiment: sentiment as any,
          language: result.language,
          confidence: result.confidence.toString(),
          processingTime: Date.now() - startTime,
        });

        return reply.status(201).send({
          success: true,
          transcription,
          sentiment,
        });
      } catch (error) {
        fastify.log.error('Batch transcription error:', error);
        return reply.status(500).send({
          error: 'Failed to create transcription',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Get transcription by ID
   */
  fastify.get(
    '/:id',
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

        const transcription = await transcriptService.getById(id, tenantId);

        if (!transcription) {
          return reply.status(404).send({ error: 'Transcription not found' });
        }

        return reply.send({ transcription });
      } catch (error) {
        fastify.log.error('Get transcription error:', error);
        return reply.status(500).send({
          error: 'Failed to get transcription',
        });
      }
    }
  );

  /**
   * Get transcription by call ID
   */
  fastify.get(
    '/call/:callId',
    async (
      request: FastifyRequest<{
        Params: { callId: string };
        Querystring: { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { callId } = request.params;
        const { tenantId } = request.query;

        if (!tenantId) {
          return reply.status(400).send({ error: 'tenantId is required' });
        }

        const transcription = await transcriptService.getByCallId(callId, tenantId);

        if (!transcription) {
          return reply.status(404).send({ error: 'Transcription not found' });
        }

        return reply.send({ transcription });
      } catch (error) {
        fastify.log.error('Get transcription by call error:', error);
        return reply.status(500).send({
          error: 'Failed to get transcription',
        });
      }
    }
  );

  /**
   * Search transcriptions
   */
  fastify.post(
    '/search',
    async (
      request: FastifyRequest<{
        Body: z.infer<typeof searchSchema> & { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const data = searchSchema.extend({ tenantId: z.string().uuid() }).parse(request.body);

        const transcriptions = await transcriptService.search(data.tenantId, data.query, {
          limit: data.limit,
          offset: data.offset,
        });

        return reply.send({
          transcriptions,
          count: transcriptions.length,
        });
      } catch (error) {
        fastify.log.error('Search transcriptions error:', error);
        return reply.status(500).send({
          error: 'Failed to search transcriptions',
        });
      }
    }
  );

  /**
   * Get sentiment statistics
   */
  fastify.post(
    '/sentiment/stats',
    async (
      request: FastifyRequest<{
        Body: z.infer<typeof sentimentStatsSchema> & { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const data = sentimentStatsSchema.extend({ tenantId: z.string().uuid() }).parse(request.body);

        const stats = await transcriptService.getSentimentStats(
          data.tenantId,
          data.dateFrom ? new Date(data.dateFrom) : undefined,
          data.dateTo ? new Date(data.dateTo) : undefined
        );

        return reply.send({ stats });
      } catch (error) {
        fastify.log.error('Get sentiment stats error:', error);
        return reply.status(500).send({
          error: 'Failed to get sentiment statistics',
        });
      }
    }
  );

  /**
   * Analyze sentiment for existing transcription
   */
  fastify.post(
    '/:id/sentiment',
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

        const transcription = await transcriptService.getById(id, tenantId);
        if (!transcription) {
          return reply.status(404).send({ error: 'Transcription not found' });
        }

        const speakers = transcription.speakers as any;
        const segments = speakers?.flatMap((s: any) => s.segments) || [];

        const sentiment = await sentimentAnalyzer.analyze(transcription.content, segments);

        await transcriptService.updateSentiment(id, tenantId, sentiment);

        return reply.send({ sentiment });
      } catch (error) {
        fastify.log.error('Analyze sentiment error:', error);
        return reply.status(500).send({
          error: 'Failed to analyze sentiment',
        });
      }
    }
  );

  /**
   * Get transcriptions for tenant
   */
  fastify.get(
    '/tenant/:tenantId',
    async (
      request: FastifyRequest<{
        Params: { tenantId: string };
        Querystring: { limit?: number; offset?: number };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId } = request.params;
        const { limit, offset } = request.query;

        const transcriptions = await transcriptService.getByTenant(tenantId, {
          limit: limit ? parseInt(limit.toString()) : undefined,
          offset: offset ? parseInt(offset.toString()) : undefined,
        });

        return reply.send({
          transcriptions,
          count: transcriptions.length,
        });
      } catch (error) {
        fastify.log.error('Get tenant transcriptions error:', error);
        return reply.status(500).send({
          error: 'Failed to get transcriptions',
        });
      }
    }
  );
}
