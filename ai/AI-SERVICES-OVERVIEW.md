# NexusDialer AI Services Overview

This document provides an overview of the AI services implemented for NexusDialer.

## Services Created

### 1. Speech Service (`/ai/speech-service`)

**Purpose**: Real-time and batch transcription with sentiment analysis

**Port**: 3010

**Key Features**:
- Real-time audio streaming via WebSocket
- Batch transcription for recorded calls
- Support for Google Cloud Speech-to-Text and OpenAI Whisper
- Speaker diarization (identifying who said what)
- Sentiment analysis with emotion detection
- Multi-language support
- Keyword extraction
- Alert detection (escalation triggers, profanity, compliance)

**Technology Stack**:
- Google Cloud Speech-to-Text API
- OpenAI Whisper API
- Fastify with WebSocket support
- PostgreSQL (transcriptions storage)
- Redis (caching)
- Kafka (event publishing)

**Key Files**:
- `src/index.ts` - Main server
- `src/transcription/realtime.ts` - Real-time streaming transcription
- `src/transcription/batch.ts` - Batch transcription for recordings
- `src/sentiment/analyzer.ts` - Sentiment analysis engine
- `src/services/transcript-service.ts` - Database operations
- `src/routes/transcription.ts` - REST API endpoints
- `src/websocket/audio-stream.ts` - WebSocket handler

**API Endpoints**:
- `POST /api/transcription/batch` - Create batch transcription job
- `GET /api/transcription/:id` - Get transcription by ID
- `GET /api/transcription/call/:callId` - Get transcription by call ID
- `POST /api/transcription/search` - Search transcriptions
- `POST /api/transcription/sentiment/stats` - Get sentiment statistics
- `WS /ws/audio-stream` - Real-time audio streaming

**Events Published**:
- `ai.transcription-ready` - When transcription is complete
- `ai.sentiment-analyzed` - When sentiment analysis is complete

### 2. Agent Assist Service (`/ai/agent-assist`)

**Purpose**: Real-time agent assistance with AI-powered suggestions and knowledge base

**Port**: 3011

**Key Features**:
- Real-time response suggestions using GPT-4
- Semantic knowledge base search using vector embeddings
- Multiple suggestion types:
  - Response suggestions (what to say)
  - Knowledge article recommendations
  - Action suggestions (schedule callback, send email)
  - Alerts (escalation triggers, negative sentiment)
  - Compliance reminders (GDPR, PCI-DSS)
- Call summary generation with action items
- Agent assist analytics and feedback tracking
- Vector-based semantic search with Qdrant

**Technology Stack**:
- OpenAI GPT-4 (suggestions and summaries)
- OpenAI Embeddings (semantic search)
- Qdrant Vector Database
- Fastify
- PostgreSQL (knowledge articles, assist events)
- Redis (caching)
- Kafka (event consumption and publishing)

**Key Files**:
- `src/index.ts` - Main server
- `src/services/suggestion-engine.ts` - AI suggestion generation
- `src/services/knowledge-base.ts` - Knowledge article management
- `src/routes/assist.ts` - REST API endpoints
- `src/consumers/transcription-consumer.ts` - Kafka consumer
- `src/lib/vector-store.ts` - Qdrant integration

**API Endpoints**:

Suggestions:
- `POST /api/assist/suggestions` - Generate real-time suggestions
- `GET /api/assist/suggestions/:callId` - Get cached suggestions
- `POST /api/assist/suggestions/:id/feedback` - Submit feedback
- `POST /api/assist/summary` - Generate call summary

Knowledge Base:
- `POST /api/assist/knowledge/search` - Semantic search
- `POST /api/assist/knowledge` - Create article
- `GET /api/assist/knowledge/:id` - Get article
- `PATCH /api/assist/knowledge/:id` - Update article
- `DELETE /api/assist/knowledge/:id` - Delete article
- `GET /api/assist/knowledge` - List articles
- `GET /api/assist/knowledge/popular` - Get popular articles
- `POST /api/assist/knowledge/:id/helpful` - Mark as helpful

Analytics:
- `GET /api/assist/analytics` - Get suggestion analytics

**Events Consumed**:
- `ai.transcription-ready` - Triggers automatic suggestion generation

**Events Published**:
- `ai.suggestion-generated` - When new suggestion is created
- `ai.summary-ready` - When call summary is generated

## Database Schema

Both services use the existing database schema defined in `@nexusdialer/database`:

### Transcriptions Table
```sql
CREATE TABLE transcriptions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  call_id UUID NOT NULL REFERENCES calls(id),
  content TEXT NOT NULL,
  speakers JSONB DEFAULT '[]',
  keywords JSONB DEFAULT '[]',
  sentiment JSONB DEFAULT '{}',
  language VARCHAR(10),
  confidence DECIMAL(3,2),
  processing_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Agent Assist Events Table
```sql
CREATE TABLE agent_assist_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  call_id UUID NOT NULL REFERENCES calls(id),
  agent_id UUID NOT NULL REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  content JSONB NOT NULL,
  shown_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted INTEGER, -- null = no action, 0 = rejected, 1 = accepted
  feedback VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Knowledge Articles Table
```sql
CREATE TABLE knowledge_articles (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  tags JSONB DEFAULT '[]',
  embedding_id VARCHAR(100), -- Vector DB reference
  status VARCHAR(20) DEFAULT 'published',
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Event-Driven Architecture

```
┌─────────────────┐
│  Call Started   │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│  WebRTC Gateway      │
│  (Audio Streaming)   │
└─────────┬────────────┘
          │ WebSocket
          ▼
┌──────────────────────────┐
│  Speech Service          │
│  - Transcribe Audio      │
│  - Analyze Sentiment     │
│  - Store in DB           │
└─────────┬────────────────┘
          │ Kafka: ai.transcription-ready
          ▼
┌──────────────────────────┐
│  Agent Assist Service    │
│  - Generate Suggestions  │
│  - Search Knowledge Base │
│  - Detect Alerts         │
└─────────┬────────────────┘
          │ Kafka: ai.suggestion-generated
          ▼
┌──────────────────────────┐
│  Agent Dashboard (Web)   │
│  - Display Transcript    │
│  - Show Suggestions      │
│  - Surface Knowledge     │
└──────────────────────────┘
```

## Setup Instructions

### 1. Install Dependencies

```bash
# Speech Service
cd ai/speech-service
npm install

# Agent Assist Service
cd ../agent-assist
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` in each service and configure:

**Speech Service**:
- `GOOGLE_APPLICATION_CREDENTIALS` or `OPENAI_API_KEY`
- Database, Redis, Kafka connection details

**Agent Assist Service**:
- `OPENAI_API_KEY` (required for GPT-4 and embeddings)
- `QDRANT_URL` (vector database)
- Database, Redis, Kafka connection details

### 3. Start Qdrant Vector Database

```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 4. Run Migrations

Database schema is already included in `@nexusdialer/database`. Run migrations:

```bash
cd ../../packages/database
npm run migrate
```

### 5. Start Services

```bash
# Development mode
cd ai/speech-service
npm run dev

cd ../agent-assist
npm run dev
```

## Usage Example

### 1. Start Real-time Transcription

```javascript
const ws = new WebSocket('ws://localhost:3010/ws/audio-stream');

// Send metadata
ws.send(JSON.stringify({
  callId: 'uuid',
  tenantId: 'uuid',
  languageCode: 'en-US',
  sampleRate: 8000,
  encoding: 'MULAW'
}));

// Stream audio chunks
audioStream.on('data', (chunk) => {
  ws.send(chunk);
});

// Receive transcripts
ws.on('message', (data) => {
  const message = JSON.parse(data);

  if (message.type === 'final-transcript') {
    console.log('Transcript:', message.data.text);
    console.log('Sentiment:', message.sentiment);
  }
});
```

### 2. Get Real-time Suggestions

```javascript
// After transcription event is published, request suggestions
const response = await fetch('http://localhost:3011/api/assist/suggestions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    callId: 'uuid',
    tenantId: 'uuid',
    agentId: 'uuid',
    recentTranscript: 'Customer is upset about delayed order...',
    customerSentiment: 'negative'
  })
});

const { suggestions } = await response.json();
// Display suggestions to agent in real-time
```

### 3. Search Knowledge Base

```javascript
const response = await fetch('http://localhost:3011/api/assist/knowledge/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenantId: 'uuid',
    query: 'How to handle refund requests?',
    limit: 3,
    minScore: 0.7
  })
});

const { articles } = await response.json();
// Show relevant knowledge articles to agent
```

## Performance Considerations

### Speech Service
- WebSocket connections: ~100 concurrent streams
- Transcription latency: 200-500ms (Google), 2-5s (Whisper)
- Database writes: Batched for efficiency
- Redis caching: Transcript segments cached for 5 minutes

### Agent Assist Service
- GPT-4 latency: 1-3 seconds per suggestion
- Vector search: <100ms for semantic search
- Suggestions cached in Redis for 5 minutes
- Kafka consumer lag: <1 second

## Cost Considerations

### Speech Service
- Google Cloud Speech: ~$0.016 per minute (phone call model)
- OpenAI Whisper: ~$0.006 per minute
- Storage: Minimal (transcripts are text)

### Agent Assist Service
- OpenAI GPT-4: ~$0.03 per suggestion (varies by length)
- OpenAI Embeddings: ~$0.0001 per article
- Qdrant: Free (self-hosted) or $25+/month (cloud)

## Monitoring

Both services expose health endpoints:
- `GET /health` - Service health status

Recommended monitoring:
- WebSocket connection count
- Transcription success rate
- Suggestion acceptance rate
- API response times
- Kafka consumer lag
- Database query performance

## Future Enhancements

### Speech Service
- [ ] Support for more language models (Azure, AWS)
- [ ] Custom vocabulary and domain-specific models
- [ ] Real-time translation
- [ ] Voice activity detection
- [ ] Noise reduction preprocessing

### Agent Assist Service
- [ ] Fine-tuned models for specific industries
- [ ] Multi-turn conversation context
- [ ] Proactive suggestions (before agent speaks)
- [ ] Integration with CRM for customer history
- [ ] A/B testing framework for suggestion quality

## License

Proprietary - NexusDialer
