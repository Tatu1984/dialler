# NexusDialer Speech Service

AI-powered speech-to-text and sentiment analysis service for NexusDialer.

## Features

- **Real-time Transcription**: WebSocket-based audio streaming with live transcription
- **Batch Transcription**: Post-call transcription for recorded audio files
- **Multiple Providers**: Support for Google Cloud Speech-to-Text and OpenAI Whisper
- **Speaker Diarization**: Automatic speaker identification and separation
- **Sentiment Analysis**: Real-time sentiment analysis on transcripts
- **Multi-language Support**: Transcribe calls in multiple languages
- **Event-Driven**: Publishes transcription and sentiment events to Kafka

## Architecture

```
┌─────────────────┐
│  WebRTC Gateway │
└────────┬────────┘
         │ Audio Stream (WebSocket)
         ▼
┌─────────────────────────────────┐
│     Speech Service              │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Real-time Transcription  │  │
│  │  - Google Speech API     │  │
│  │  - OpenAI Whisper        │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Sentiment Analysis       │  │
│  │  - Lexicon-based         │  │
│  │  - Emotion detection     │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Storage                  │  │
│  │  - PostgreSQL            │  │
│  │  - Redis Cache           │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
         │
         ▼
    Kafka Events
```

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`, `REDIS_PORT`: Redis configuration
- `KAFKA_BROKERS`: Kafka broker addresses
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Google Cloud service account key (for Google Speech)
- `OPENAI_API_KEY`: OpenAI API key (for Whisper)

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## API Endpoints

### REST API

#### POST `/api/transcription/batch`

Create a batch transcription job.

**Request:**
```json
{
  "callId": "uuid",
  "tenantId": "uuid",
  "audioUrl": "gs://bucket/recording.wav",
  "languageCode": "en-US",
  "enableSpeakerDiarization": true,
  "provider": "google"
}
```

**Response:**
```json
{
  "success": true,
  "transcription": {
    "id": "uuid",
    "content": "Full transcript...",
    "speakers": [...],
    "keywords": ["keyword1", "keyword2"],
    "confidence": 0.95,
    "processingTime": 1234
  },
  "sentiment": {
    "overall": "positive",
    "score": 0.65,
    "segments": [...]
  }
}
```

#### GET `/api/transcription/:id`

Get transcription by ID.

#### GET `/api/transcription/call/:callId`

Get transcription for a specific call.

#### POST `/api/transcription/search`

Search transcriptions by content.

#### POST `/api/transcription/sentiment/stats`

Get sentiment statistics for a date range.

### WebSocket API

#### `/ws/audio-stream`

Real-time audio streaming endpoint.

**First Message (Metadata):**
```json
{
  "callId": "uuid",
  "tenantId": "uuid",
  "languageCode": "en-US",
  "sampleRate": 8000,
  "encoding": "MULAW",
  "provider": "google"
}
```

**Subsequent Messages:**
Binary audio data (Buffer)

**Server Messages:**

```json
// Started
{
  "type": "started",
  "transcriptionId": "uuid"
}

// Interim transcript
{
  "type": "interim-transcript",
  "data": {
    "text": "Hello...",
    "confidence": 0.87,
    "isFinal": false
  }
}

// Final transcript with sentiment
{
  "type": "final-transcript",
  "data": {
    "text": "Hello, how can I help you?",
    "confidence": 0.95,
    "isFinal": true
  },
  "sentiment": {
    "score": 0.5,
    "label": "neutral"
  }
}

// Completed
{
  "type": "completed",
  "data": {
    "transcriptionId": "uuid",
    "transcript": "Full transcript...",
    "sentiment": {...},
    "keywords": [...],
    "processingTime": 1234
  }
}
```

## Events Published

### `ai.transcription-ready`

Published when transcription is complete.

### `ai.sentiment-analyzed`

Published when sentiment analysis is complete.

## Supported Languages

- English (en-US, en-GB, en-AU)
- Spanish (es-ES, es-MX)
- French (fr-FR, fr-CA)
- German (de-DE)
- Italian (it-IT)
- Portuguese (pt-BR, pt-PT)
- And many more...

See Google Cloud Speech or OpenAI Whisper documentation for full list.

## License

Proprietary - NexusDialer
