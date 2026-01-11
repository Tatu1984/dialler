import { SpeechClient } from '@google-cloud/speech';
import { Readable } from 'stream';
import { EventEmitter } from 'events';

export interface TranscriptSegment {
  text: string;
  confidence: number;
  startTime: number;
  endTime: number;
  isFinal: boolean;
  speaker?: string;
}

export interface RealtimeTranscriptionOptions {
  languageCode?: string;
  sampleRateHertz?: number;
  encoding?: 'LINEAR16' | 'MULAW' | 'ALAW';
  enableSpeakerDiarization?: boolean;
  maxSpeakerCount?: number;
  enableAutomaticPunctuation?: boolean;
  model?: 'default' | 'phone_call' | 'video';
}

export class RealtimeTranscriber extends EventEmitter {
  private client: SpeechClient | null = null;
  private recognizeStream: any = null;
  private readonly options: RealtimeTranscriptionOptions;
  private audioBuffer: Buffer[] = [];
  private isActive: boolean = false;

  constructor(options: RealtimeTranscriptionOptions = {}) {
    super();
    this.options = {
      languageCode: options.languageCode || 'en-US',
      sampleRateHertz: options.sampleRateHertz || 8000,
      encoding: options.encoding || 'MULAW',
      enableSpeakerDiarization: options.enableSpeakerDiarization ?? true,
      maxSpeakerCount: options.maxSpeakerCount || 2,
      enableAutomaticPunctuation: options.enableAutomaticPunctuation ?? true,
      model: options.model || 'phone_call',
    };

    // Initialize Google Speech client if credentials are available
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      this.client = new SpeechClient();
    }
  }

  async start(): Promise<void> {
    if (this.isActive) {
      throw new Error('Transcription already active');
    }

    if (!this.client) {
      throw new Error('Google Speech client not initialized. Set GOOGLE_APPLICATION_CREDENTIALS');
    }

    this.isActive = true;

    const request = {
      config: {
        encoding: this.options.encoding as any,
        sampleRateHertz: this.options.sampleRateHertz,
        languageCode: this.options.languageCode,
        enableAutomaticPunctuation: this.options.enableAutomaticPunctuation,
        model: this.options.model,
        diarizationConfig: this.options.enableSpeakerDiarization
          ? {
              enableSpeakerDiarization: true,
              minSpeakerCount: 1,
              maxSpeakerCount: this.options.maxSpeakerCount,
            }
          : undefined,
      },
      interimResults: true,
    };

    this.recognizeStream = this.client
      .streamingRecognize(request)
      .on('error', (error: Error) => {
        this.emit('error', error);
        this.isActive = false;
      })
      .on('data', (data: any) => {
        if (data.results[0] && data.results[0].alternatives[0]) {
          const result = data.results[0];
          const alternative = result.alternatives[0];

          const segment: TranscriptSegment = {
            text: alternative.transcript,
            confidence: alternative.confidence || 0,
            startTime: result.resultEndTime?.seconds || 0,
            endTime: result.resultEndTime?.seconds || 0,
            isFinal: result.isFinal || false,
            speaker: result.channelTag ? `speaker_${result.channelTag}` : undefined,
          };

          this.emit('transcript', segment);

          if (result.isFinal) {
            this.emit('final-transcript', segment);
          }
        }
      });

    this.emit('started');
  }

  writeAudio(audioChunk: Buffer): void {
    if (!this.isActive || !this.recognizeStream) {
      this.audioBuffer.push(audioChunk);
      return;
    }

    // Write buffered audio first
    if (this.audioBuffer.length > 0) {
      this.audioBuffer.forEach((chunk) => {
        this.recognizeStream.write(chunk);
      });
      this.audioBuffer = [];
    }

    // Write current chunk
    this.recognizeStream.write(audioChunk);
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    if (this.recognizeStream) {
      this.recognizeStream.end();
      this.recognizeStream = null;
    }

    this.audioBuffer = [];
    this.emit('stopped');
  }

  isTranscribing(): boolean {
    return this.isActive;
  }
}

// OpenAI Whisper implementation for comparison/fallback
export class WhisperTranscriber extends EventEmitter {
  private audioBuffer: Buffer[] = [];
  private isActive: boolean = false;
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly apiKey: string;
  private readonly options: RealtimeTranscriptionOptions;

  constructor(apiKey: string, options: RealtimeTranscriptionOptions = {}) {
    super();
    this.apiKey = apiKey;
    this.options = {
      languageCode: options.languageCode || 'en',
      ...options,
    };
  }

  async start(): Promise<void> {
    if (this.isActive) {
      throw new Error('Transcription already active');
    }

    this.isActive = true;
    this.audioBuffer = [];

    // Flush buffer every 5 seconds for near-realtime transcription
    this.flushInterval = setInterval(() => {
      this.flushBuffer();
    }, 5000);

    this.emit('started');
  }

  writeAudio(audioChunk: Buffer): void {
    if (!this.isActive) {
      return;
    }

    this.audioBuffer.push(audioChunk);

    // Auto-flush if buffer gets too large (> 1MB)
    const bufferSize = this.audioBuffer.reduce((acc, chunk) => acc + chunk.length, 0);
    if (bufferSize > 1024 * 1024) {
      this.flushBuffer();
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.audioBuffer.length === 0) {
      return;
    }

    const audioData = Buffer.concat(this.audioBuffer);
    this.audioBuffer = [];

    try {
      // Note: This is a simplified implementation
      // In production, you would convert audio to appropriate format and call OpenAI API
      const segment: TranscriptSegment = {
        text: '', // Would be filled by API response
        confidence: 0.95,
        startTime: Date.now(),
        endTime: Date.now(),
        isFinal: true,
      };

      this.emit('transcript', segment);
      this.emit('final-transcript', segment);
    } catch (error) {
      this.emit('error', error);
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Flush any remaining audio
    await this.flushBuffer();

    this.emit('stopped');
  }

  isTranscribing(): boolean {
    return this.isActive;
  }
}
