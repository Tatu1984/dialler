import { SpeechClient } from '@google-cloud/speech';
import OpenAI from 'openai';
import { readFile } from 'fs/promises';

export interface BatchTranscriptionResult {
  content: string;
  speakers: Array<{
    id: string;
    role: 'agent' | 'customer';
    segments: Array<{
      start: number;
      end: number;
      text: string;
      confidence: number;
    }>;
  }>;
  keywords: string[];
  language: string;
  confidence: number;
  processingTime: number;
}

export interface BatchTranscriptionOptions {
  languageCode?: string;
  enableSpeakerDiarization?: boolean;
  maxSpeakerCount?: number;
  enableAutomaticPunctuation?: boolean;
  model?: 'default' | 'phone_call' | 'video';
  audioEncoding?: 'LINEAR16' | 'MULAW' | 'ALAW' | 'FLAC' | 'OGG_OPUS';
  sampleRateHertz?: number;
}

/**
 * Google Cloud Speech-to-Text batch transcription
 */
export class GoogleBatchTranscriber {
  private client: SpeechClient;

  constructor() {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS not set');
    }
    this.client = new SpeechClient();
  }

  async transcribeFile(
    audioFilePath: string,
    options: BatchTranscriptionOptions = {}
  ): Promise<BatchTranscriptionResult> {
    const startTime = Date.now();

    const audioBytes = await readFile(audioFilePath);
    const audio = {
      content: audioBytes.toString('base64'),
    };

    const config = {
      encoding: (options.audioEncoding || 'MULAW') as any,
      sampleRateHertz: options.sampleRateHertz || 8000,
      languageCode: options.languageCode || 'en-US',
      enableAutomaticPunctuation: options.enableAutomaticPunctuation ?? true,
      enableWordTimeOffsets: true,
      model: options.model || 'phone_call',
      diarizationConfig: options.enableSpeakerDiarization
        ? {
            enableSpeakerDiarization: true,
            minSpeakerCount: 1,
            maxSpeakerCount: options.maxSpeakerCount || 2,
          }
        : undefined,
    };

    const request = {
      audio,
      config,
    };

    const [response] = await this.client.recognize(request);
    const transcription = response.results
      ?.map((result) => result.alternatives?.[0]?.transcript)
      .join('\n');

    // Extract speaker segments
    const speakers: BatchTranscriptionResult['speakers'] = [];
    const speakerMap = new Map<number, BatchTranscriptionResult['speakers'][0]>();

    response.results?.forEach((result) => {
      const alternative = result.alternatives?.[0];
      if (!alternative) return;

      const words = alternative.words || [];
      words.forEach((wordInfo) => {
        const speakerTag = wordInfo.speakerTag || 0;

        if (!speakerMap.has(speakerTag)) {
          speakerMap.set(speakerTag, {
            id: `speaker_${speakerTag}`,
            role: speakerTag === 1 ? 'agent' : 'customer', // Heuristic
            segments: [],
          });
        }

        const speaker = speakerMap.get(speakerTag)!;
        const lastSegment = speaker.segments[speaker.segments.length - 1];

        const startTime = parseFloat(wordInfo.startTime?.seconds || '0');
        const endTime = parseFloat(wordInfo.endTime?.seconds || '0');

        // Merge words into segments if they're close together (< 1 second gap)
        if (lastSegment && startTime - lastSegment.end < 1) {
          lastSegment.text += ' ' + wordInfo.word;
          lastSegment.end = endTime;
        } else {
          speaker.segments.push({
            start: startTime,
            end: endTime,
            text: wordInfo.word || '',
            confidence: alternative.confidence || 0,
          });
        }
      });
    });

    speakers.push(...speakerMap.values());

    // Extract keywords (simplified - just extract frequent words)
    const keywords = this.extractKeywords(transcription || '');

    const processingTime = Date.now() - startTime;

    return {
      content: transcription || '',
      speakers,
      keywords,
      language: options.languageCode || 'en-US',
      confidence: response.results?.[0]?.alternatives?.[0]?.confidence || 0,
      processingTime,
    };
  }

  async transcribeUrl(
    audioUrl: string,
    options: BatchTranscriptionOptions = {}
  ): Promise<BatchTranscriptionResult> {
    const startTime = Date.now();

    const config = {
      encoding: (options.audioEncoding || 'MULAW') as any,
      sampleRateHertz: options.sampleRateHertz || 8000,
      languageCode: options.languageCode || 'en-US',
      enableAutomaticPunctuation: options.enableAutomaticPunctuation ?? true,
      enableWordTimeOffsets: true,
      model: options.model || 'phone_call',
      diarizationConfig: options.enableSpeakerDiarization
        ? {
            enableSpeakerDiarization: true,
            minSpeakerCount: 1,
            maxSpeakerCount: options.maxSpeakerCount || 2,
          }
        : undefined,
    };

    const audio = {
      uri: audioUrl,
    };

    const request = {
      audio,
      config,
    };

    const [operation] = await this.client.longRunningRecognize(request);
    const [response] = await operation.promise();

    const transcription = response.results
      ?.map((result) => result.alternatives?.[0]?.transcript)
      .join('\n');

    const speakers: BatchTranscriptionResult['speakers'] = [];
    const keywords = this.extractKeywords(transcription || '');
    const processingTime = Date.now() - startTime;

    return {
      content: transcription || '',
      speakers,
      keywords,
      language: options.languageCode || 'en-US',
      confidence: response.results?.[0]?.alternatives?.[0]?.confidence || 0,
      processingTime,
    };
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the',
      'is',
      'at',
      'which',
      'on',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'with',
      'to',
      'for',
      'of',
      'as',
      'by',
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    const frequency = new Map<string, number>();
    words.forEach((word) => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
}

/**
 * OpenAI Whisper batch transcription
 */
export class WhisperBatchTranscriber {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async transcribeFile(
    audioFilePath: string,
    options: BatchTranscriptionOptions = {}
  ): Promise<BatchTranscriptionResult> {
    const startTime = Date.now();

    const transcription = await this.client.audio.transcriptions.create({
      file: await readFile(audioFilePath) as any,
      model: 'whisper-1',
      language: options.languageCode?.split('-')[0] || 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    // Whisper doesn't provide speaker diarization out of the box
    // You would need to use a separate service or library for that
    const speakers: BatchTranscriptionResult['speakers'] = [
      {
        id: 'speaker_0',
        role: 'agent',
        segments: [],
      },
    ];

    const keywords = this.extractKeywords(transcription.text);
    const processingTime = Date.now() - startTime;

    return {
      content: transcription.text,
      speakers,
      keywords,
      language: transcription.language || options.languageCode || 'en',
      confidence: 0.95, // Whisper doesn't provide confidence scores
      processingTime,
    };
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the',
      'is',
      'at',
      'which',
      'on',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'with',
      'to',
      'for',
      'of',
      'as',
      'by',
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    const frequency = new Map<string, number>();
    words.forEach((word) => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
}
