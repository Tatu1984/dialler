# NexusDialer Agent Assist Service

AI-powered real-time agent assistance and knowledge management for NexusDialer.

## Features

- **Real-time Suggestions**: AI-generated response suggestions during live calls
- **Knowledge Base**: Semantic search over knowledge articles using vector embeddings
- **Agent Assist Events**: Track and analyze suggestion effectiveness
- **Call Summaries**: Automatic generation of call summaries and action items
- **Compliance Alerts**: Real-time detection of compliance and escalation triggers
- **Multi-modal Suggestions**: Response, knowledge, action, alert, and compliance suggestions

## Architecture

```
┌──────────────────┐
│  Speech Service  │
│  (Transcription) │
└────────┬─────────┘
         │ Kafka Events
         ▼
┌─────────────────────────────────┐
│     Agent Assist Service        │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Suggestion Engine        │  │
│  │  - GPT-4 Integration     │  │
│  │  - Pattern Matching      │  │
│  │  - Context Analysis      │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Knowledge Base           │  │
│  │  - Vector Store (Qdrant) │  │
│  │  - Semantic Search       │  │
│  │  - Article Management    │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Analytics                │  │
│  │  - Acceptance Tracking   │  │
│  │  - Performance Metrics   │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
         │
         ▼
   Agent Dashboard
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
- `OPENAI_API_KEY`: OpenAI API key for GPT-4 and embeddings
- `QDRANT_URL`: Qdrant vector store URL
- `QDRANT_API_KEY`: Qdrant API key (optional)

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

### Suggestion Endpoints

#### POST `/api/assist/suggestions`

Generate real-time suggestions for an active call.

**Request:**
```json
{
  "callId": "uuid",
  "tenantId": "uuid",
  "agentId": "uuid",
  "recentTranscript": "Recent conversation...",
  "fullTranscript": "Complete conversation...",
  "customerSentiment": "negative",
  "callMetadata": {
    "duration": 300
  }
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "id": "suggestion-uuid",
      "type": "response",
      "content": "I understand your frustration. Let me help resolve this...",
      "confidence": 0.92,
      "priority": "high",
      "context": {
        "trigger": "conversation_analysis"
      }
    },
    {
      "id": "suggestion-uuid",
      "type": "knowledge",
      "content": "Relevant article: Refund Policy...",
      "confidence": 0.85,
      "source": "article-uuid",
      "priority": "medium"
    },
    {
      "id": "suggestion-uuid",
      "type": "alert",
      "content": "ALERT: Escalation trigger detected - cancel, refund",
      "confidence": 0.95,
      "priority": "high"
    }
  ]
}
```

#### GET `/api/assist/suggestions/:callId`

Get cached suggestions for a call.

#### POST `/api/assist/suggestions/:id/feedback`

Submit feedback on a suggestion.

**Request:**
```json
{
  "tenantId": "uuid",
  "suggestionId": "uuid",
  "accepted": true,
  "feedback": "helpful"
}
```

#### POST `/api/assist/summary`

Generate call summary and action items.

**Request:**
```json
{
  "callId": "uuid",
  "tenantId": "uuid",
  "fullTranscript": "Complete conversation..."
}
```

**Response:**
```json
{
  "summary": {
    "summary": "Customer called about...",
    "keyPoints": [
      "Issue with recent order",
      "Requested refund",
      "Scheduled callback"
    ],
    "actionItems": [
      {
        "description": "Process refund",
        "assignee": "agent"
      }
    ],
    "outcome": "Issue resolved, customer satisfied"
  }
}
```

### Knowledge Base Endpoints

#### POST `/api/assist/knowledge/search`

Search knowledge base using semantic search.

**Request:**
```json
{
  "tenantId": "uuid",
  "query": "How to process a refund?",
  "category": "policies",
  "limit": 5,
  "minScore": 0.7
}
```

**Response:**
```json
{
  "articles": [
    {
      "id": "uuid",
      "title": "Refund Policy",
      "content": "Our refund policy...",
      "category": "policies",
      "tags": ["refund", "policy"],
      "relevance": 0.92,
      "viewCount": 150,
      "helpfulCount": 45
    }
  ]
}
```

#### POST `/api/assist/knowledge`

Create a new knowledge article.

**Request:**
```json
{
  "tenantId": "uuid",
  "title": "How to Handle Complaints",
  "content": "Step 1: Listen actively...",
  "category": "training",
  "tags": ["complaints", "customer-service"],
  "status": "published"
}
```

#### GET `/api/assist/knowledge/:id`

Get knowledge article by ID.

#### PATCH `/api/assist/knowledge/:id`

Update knowledge article.

#### DELETE `/api/assist/knowledge/:id`

Delete (archive) knowledge article.

#### GET `/api/assist/knowledge`

Get all knowledge articles for a tenant.

#### GET `/api/assist/knowledge/popular`

Get popular knowledge articles.

#### POST `/api/assist/knowledge/:id/helpful`

Mark article as helpful.

### Analytics Endpoints

#### GET `/api/assist/analytics`

Get suggestion analytics.

**Query Parameters:**
- `tenantId`: Tenant ID (required)
- `dateFrom`: Start date (optional)
- `dateTo`: End date (optional)

**Response:**
```json
{
  "analytics": [
    {
      "event_type": "response",
      "total": 150,
      "accepted": 120,
      "rejected": 20,
      "no_action": 10,
      "acceptance_rate": 0.8
    }
  ]
}
```

## Suggestion Types

### Response Suggestions
AI-generated response templates based on conversation context.

### Knowledge Suggestions
Relevant knowledge articles surfaced based on conversation topics.

### Action Suggestions
Recommended next steps (schedule callback, send email, etc.).

### Alert Suggestions
Critical alerts for escalation triggers, negative sentiment, etc.

### Compliance Suggestions
Compliance reminders for GDPR, PCI-DSS, recording consent, etc.

## Event Consumption

The service consumes the following Kafka events:

- `ai.transcription-ready`: Triggers automatic suggestion generation

## Events Published

- `ai.suggestion-generated`: When a new suggestion is created
- `ai.summary-ready`: When a call summary is generated

## Vector Store

The service uses Qdrant for semantic search over knowledge articles:

- **Collection**: `knowledge_articles`
- **Vector Size**: 1536 (OpenAI text-embedding-3-small)
- **Distance Metric**: Cosine similarity

## Performance Considerations

- Suggestions are cached in Redis for 5 minutes
- Knowledge article embeddings are pre-computed and stored
- GPT-4 calls are made asynchronously to avoid blocking
- Kafka consumers run in background for real-time processing

## License

Proprietary - NexusDialer
