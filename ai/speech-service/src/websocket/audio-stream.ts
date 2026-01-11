import { FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import { RealtimeTranscriber, WhisperTranscriber } from '../transcription/realtime.js';
import { SentimentAnalyzer } from '../sentiment/analyzer.js';
import { TranscriptService } from '../services/transcript-service.js';
import { v4 as uuidv4 } from 'crypto';

interface AudioStreamMetadata {
  callId: string;
  tenantId: string;
  languageCode?: string;
  sampleRate?: number;
  encoding?: 'LINEAR16' | 'MULAW' | 'ALAW';
  provider?: 'google' | 'whisper';
}

interface StreamSession {
  transcriber: RealtimeTranscriber | WhisperTranscriber;
  sentimentAnalyzer: SentimentAnalyzer;
  transcriptService: TranscriptService;
  metadata: AudioStreamMetadata;
  transcriptionId: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
    confidence: number;
  }>;
  fullTranscript: string;
  startTime: number;
}

const activeSessions = new Map<WebSocket, StreamSession>();

/**
 * WebSocket handler for real-time audio streaming and transcription
 */
export async function audioStreamHandler(
  connection: WebSocket,
  request: FastifyRequest
): Promise<void> {
  console.log('New audio stream connection established');

  let session: StreamSession | null = null;

  connection.on('message', async (data: Buffer | string) => {
    try {
      // First message should be metadata
      if (!session) {
        if (typeof data === 'string') {
          const metadata: AudioStreamMetadata = JSON.parse(data);

          // Validate metadata
          if (!metadata.callId || !metadata.tenantId) {
            connection.send(
              JSON.stringify({
                type: 'error',
                error: 'callId and tenantId are required in metadata',
              })
            );
            connection.close();
            return;
          }

          // Create transcriber based on provider
          const provider = metadata.provider || 'google';
          let transcriber: RealtimeTranscriber | WhisperTranscriber;

          if (provider === 'google') {
            transcriber = new RealtimeTranscriber({
              languageCode: metadata.languageCode,
              sampleRateHertz: metadata.sampleRate,
              encoding: metadata.encoding,
              enableSpeakerDiarization: true,
            });
          } else {
            if (!process.env.OPENAI_API_KEY) {
              connection.send(
                JSON.stringify({
                  type: 'error',
                  error: 'OpenAI API key not configured',
                })
              );
              connection.close();
              return;
            }

            transcriber = new WhisperTranscriber(process.env.OPENAI_API_KEY, {
              languageCode: metadata.languageCode,
            });
          }

          // Initialize session
          session = {
            transcriber,
            sentimentAnalyzer: new SentimentAnalyzer(),
            transcriptService: new TranscriptService(),
            metadata,
            transcriptionId: uuidv4(),
            segments: [],
            fullTranscript: '',
            startTime: Date.now(),
          };

          activeSessions.set(connection, session);

          // Set up transcriber event handlers
          transcriber.on('transcript', (segment) => {
            connection.send(
              JSON.stringify({
                type: 'interim-transcript',
                data: segment,
              })
            );
          });

          transcriber.on('final-transcript', async (segment) => {
            session!.segments.push({
              start: segment.startTime,
              end: segment.endTime,
              text: segment.text,
              confidence: segment.confidence,
            });

            session!.fullTranscript += (session!.fullTranscript ? ' ' : '') + segment.text;

            // Analyze sentiment for this segment
            const sentimentSegment = await session!.sentimentAnalyzer.analyzeSegment(
              segment.text,
              segment.startTime
            );

            connection.send(
              JSON.stringify({
                type: 'final-transcript',
                data: segment,
                sentiment: sentimentSegment,
              })
            );
          });

          transcriber.on('error', (error) => {
            console.error('Transcription error:', error);
            connection.send(
              JSON.stringify({
                type: 'error',
                error: error.message,
              })
            );
          });

          transcriber.on('started', () => {
            connection.send(
              JSON.stringify({
                type: 'started',
                transcriptionId: session!.transcriptionId,
              })
            );
          });

          // Start transcription
          await transcriber.start();
        } else {
          connection.send(
            JSON.stringify({
              type: 'error',
              error: 'First message must be metadata (JSON string)',
            })
          );
          connection.close();
          return;
        }
      } else {
        // Subsequent messages are audio data
        if (Buffer.isBuffer(data)) {
          session.transcriber.writeAudio(data);
        } else {
          // Check if it's a control message
          try {
            const message = JSON.parse(data);
            if (message.type === 'stop') {
              await finalizeSession(session, connection);
            }
          } catch {
            // Not a JSON message, ignore
          }
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      connection.send(
        JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );
    }
  });

  connection.on('close', async () => {
    console.log('Audio stream connection closed');

    const session = activeSessions.get(connection);
    if (session) {
      await finalizeSession(session, connection);
    }
  });

  connection.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

/**
 * Finalize transcription session and save to database
 */
async function finalizeSession(session: StreamSession, connection: WebSocket): Promise<void> {
  try {
    // Stop transcriber
    if (session.transcriber.isTranscribing()) {
      await session.transcriber.stop();
    }

    // Calculate processing time
    const processingTime = Date.now() - session.startTime;

    // Analyze overall sentiment
    const sentiment = await session.sentimentAnalyzer.analyze(
      session.fullTranscript,
      session.segments
    );

    // Extract keywords (simplified - use the sentiment analyzer's keyword extraction)
    const words = session.fullTranscript
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/);
    const frequency = new Map<string, number>();
    words.forEach((word) => {
      if (word.length > 3) {
        frequency.set(word, (frequency.get(word) || 0) + 1);
      }
    });
    const keywords = Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Save to database
    const transcription = await session.transcriptService.create({
      tenantId: session.metadata.tenantId,
      callId: session.metadata.callId,
      content: session.fullTranscript,
      speakers: [
        {
          id: 'speaker_0',
          role: 'agent' as const,
          segments: session.segments,
        },
      ] as any,
      keywords: keywords as any,
      sentiment: sentiment as any,
      language: session.metadata.languageCode || 'en-US',
      confidence: (
        session.segments.reduce((sum, seg) => sum + seg.confidence, 0) / session.segments.length || 0
      ).toString(),
      processingTime,
    });

    // Send final result
    connection.send(
      JSON.stringify({
        type: 'completed',
        data: {
          transcriptionId: transcription.id,
          transcript: session.fullTranscript,
          sentiment,
          keywords,
          processingTime,
        },
      })
    );

    // Clean up
    activeSessions.delete(connection);
  } catch (error) {
    console.error('Error finalizing session:', error);
    connection.send(
      JSON.stringify({
        type: 'error',
        error: 'Failed to finalize transcription',
      })
    );
  }
}
