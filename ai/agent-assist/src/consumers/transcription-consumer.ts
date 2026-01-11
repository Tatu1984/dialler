import { Consumer } from 'kafkajs';
import { FastifyInstance } from 'fastify';
import { SuggestionEngine, type ConversationContext } from '../services/suggestion-engine.js';
import { KnowledgeBaseService } from '../services/knowledge-base.js';
import { aiTranscriptionReadySchema, type AITranscriptionReadyEvent } from '@nexusdialer/events';

/**
 * Start consuming transcription events to generate real-time suggestions
 */
export async function startTranscriptionConsumer(
  consumer: Consumer,
  fastify: FastifyInstance
): Promise<void> {
  const knowledgeBase = new KnowledgeBaseService();
  const suggestionEngine = new SuggestionEngine(knowledgeBase);

  await consumer.subscribe({
    topics: ['ai-events'],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        if (!message.value) return;

        const event = JSON.parse(message.value.toString());

        // Handle transcription-ready events
        if (event.type === 'ai.transcription-ready') {
          const validatedEvent = aiTranscriptionReadySchema.parse(event);
          await handleTranscriptionReady(validatedEvent, suggestionEngine, fastify);
        }
      } catch (error) {
        fastify.log.error('Error processing transcription event:', error);
      }
    },
  });

  fastify.log.info('Transcription consumer started');
}

/**
 * Handle transcription-ready event by generating suggestions
 */
async function handleTranscriptionReady(
  event: AITranscriptionReadyEvent,
  suggestionEngine: SuggestionEngine,
  fastify: FastifyInstance
): Promise<void> {
  try {
    fastify.log.info(`Processing transcription for call: ${event.payload.callId}`);

    // Get call information to find agent ID
    const [call] = await fastify.db.execute(
      `
      SELECT agent_id FROM calls WHERE id = $1
    `,
      [event.payload.callId]
    ) as any;

    if (!call || !call.agent_id) {
      fastify.log.warn(`No agent found for call: ${event.payload.callId}`);
      return;
    }

    const agentId = call.agent_id;

    // Build conversation context
    const context: ConversationContext = {
      callId: event.payload.callId,
      tenantId: event.tenantId,
      agentId,
      recentTranscript: event.payload.content.slice(-1000), // Last 1000 chars
      fullTranscript: event.payload.content,
    };

    // Generate suggestions based on the transcription
    const suggestions = await suggestionEngine.generateSuggestions(context);

    fastify.log.info(
      `Generated ${suggestions.length} suggestions for call: ${event.payload.callId}`
    );

    // Suggestions are already published to Kafka in the suggestion engine
    // and stored in the database, so we just log here
  } catch (error) {
    fastify.log.error('Error handling transcription-ready event:', error);
  }
}
