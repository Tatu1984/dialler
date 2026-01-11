# NexusDialer - Dialer Engine

The Dialer Engine is the core telephony component of NexusDialer that manages outbound calling campaigns with support for three dialing modes:

- **Predictive Dialing**: Automatically adjusts dial ratio based on agent availability and abandon rate targets
- **Progressive Dialing**: Dials one call per available agent (1:1 ratio)
- **Preview Dialing**: Allows agents to review lead information before initiating calls

## Features

- **FreeSWITCH Integration**: Full ESL (Event Socket Library) integration for call control
- **Multiple Dial Modes**: Predictive, Progressive, and Preview dialing algorithms
- **Real-time Call State Management**: Redis-based state tracking for high-performance operations
- **Event-Driven Architecture**: Publishes call events to Kafka for downstream processing
- **Intelligent Predictive Algorithm**: Self-adjusting dial ratio based on performance metrics
- **Agent Management**: Track agent availability and distribute calls efficiently
- **Campaign Management**: Start/stop campaigns with different dialing strategies

## Architecture

### Components

1. **FreeSWITCH Client** (`src/freeswitch/client.ts`)
   - ESL connection management with auto-reconnect
   - Event subscription and processing
   - Channel state tracking

2. **FreeSWITCH Commands** (`src/freeswitch/commands.ts`)
   - Call origination
   - Call control (bridge, transfer, hold, hangup)
   - Audio playback and recording
   - DTMF handling

3. **Dialer Algorithms**
   - **Predictive** (`src/dialer/predictive.ts`): Advanced algorithm that calculates optimal call volume
   - **Progressive** (`src/dialer/progressive.ts`): 1:1 agent-to-call ratio with agent matching
   - **Preview** (`src/dialer/preview.ts`): Agent-initiated calls with lead preview

4. **Dialer Manager** (`src/dialer/manager.ts`)
   - Coordinates multiple campaigns
   - Routes FreeSWITCH events to appropriate dialers
   - Publishes events to Kafka

5. **Call Service** (`src/services/call-service.ts`)
   - Redis-based call state management
   - Agent status tracking
   - Call metrics and statistics

## API Endpoints

### Campaign Management

```bash
# Start a campaign
POST /api/v1/campaigns/start
{
  "campaignId": "uuid"
}

# Stop a campaign
POST /api/v1/campaigns/stop
{
  "campaignId": "uuid"
}

# Get campaign status
GET /api/v1/campaigns/:campaignId/status

# Get all active campaigns
GET /api/v1/campaigns/active
```

### Preview Dialing

```bash
# Request next lead to preview
POST /api/v1/preview/request
{
  "campaignId": "uuid",
  "agentId": "uuid"
}

# Accept preview and initiate call
POST /api/v1/preview/accept
{
  "campaignId": "uuid",
  "previewId": "string"
}

# Reject preview
POST /api/v1/preview/reject
{
  "campaignId": "uuid",
  "previewId": "string",
  "reason": "optional reason"
}

# Skip preview
POST /api/v1/preview/skip
{
  "campaignId": "uuid",
  "previewId": "string"
}
```

### Call Management

```bash
# Get call details
GET /api/v1/calls/:callId

# Get all active calls
GET /api/v1/calls/active

# Get campaign active calls
GET /api/v1/campaigns/:campaignId/calls
```

### Agent Management

```bash
# Update agent status
POST /api/v1/agents/status
{
  "agentId": "uuid",
  "tenantId": "uuid",
  "state": "available|on_call|wrap_up|break|offline",
  "currentCallId": "optional uuid"
}

# Get agent status
GET /api/v1/agents/:agentId/status

# Get available agents
GET /api/v1/agents/available?tenantId=uuid
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

### Environment Variables

- `PORT`: HTTP server port (default: 3010)
- `FREESWITCH_HOST`: FreeSWITCH ESL host
- `FREESWITCH_PORT`: FreeSWITCH ESL port (default: 8021)
- `FREESWITCH_PASSWORD`: FreeSWITCH ESL password
- `REDIS_URL`: Redis connection URL
- `KAFKA_BROKERS`: Comma-separated Kafka broker URLs
- `DATABASE_URL`: PostgreSQL connection string

## Installation

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode with hot reload
npm run dev

# Production mode
npm start
```

## Dialing Algorithms

### Predictive Dialing

The predictive dialer uses a sophisticated algorithm that:

1. **Calculates Optimal Dial Ratio**: Based on agent availability, answer rates, and abandon rate targets
2. **Self-Adjusts**: Continuously monitors performance and adjusts dial ratio every 30 seconds
3. **Minimizes Abandons**: Targets a configurable abandon rate (default: 3%)
4. **Maximizes Agent Utilization**: Keeps agents consistently engaged with calls

**Configuration Parameters**:
- `maxDialRatio`: Maximum calls per agent (default: 2.5)
- `minDialRatio`: Minimum calls per agent (default: 1.2)
- `abandonRateTarget`: Target abandon rate (default: 0.03)
- `answerRate`: Expected answer rate (0-1)
- `avgTalkTime`: Average talk time in seconds
- `adjustmentInterval`: How often to adjust ratio (ms)

### Progressive Dialing

Progressive dialing maintains a 1:1 ratio of calls to available agents:

1. **One Call Per Agent**: Ensures no abandons by matching calls to agents
2. **Agent Matching**: Answered calls wait for available agents
3. **Abandon Prevention**: Hangs up calls that wait too long for agents

**Configuration Parameters**:
- `callsPerAgent`: Calls per agent (typically 1)
- `agentWaitTime`: Max wait time before abandoning (seconds)
- `callTimeout`: Call timeout in seconds

### Preview Dialing

Preview dialing gives agents control over the dialing process:

1. **Lead Preview**: Agents review lead information before calling
2. **Preview Timer**: Configurable time for agents to review leads
3. **Accept/Reject/Skip**: Agents can accept, reject, or skip leads
4. **Auto-Dial Option**: Optionally auto-dial when preview timer expires

**Configuration Parameters**:
- `previewTime`: Time to preview lead (seconds)
- `autoDialAfterPreview`: Auto-dial on timer expiry (boolean)
- `callTimeout`: Call timeout in seconds

## Event Publishing

The dialer publishes events to Kafka topics:

- `calls.started`: When a call is initiated
- `calls.answered`: When a call is answered
- `calls.ended`: When a call ends
- `campaigns.lead-dialed`: When a lead is dialed

Events follow the schema defined in `@nexusdialer/events`.

## Call State Management

Call states are managed in Redis for high performance:

- **Active Calls**: Stored with 24-hour TTL
- **Agent Status**: Real-time agent availability tracking
- **Campaign Calls**: Indexed by campaign for quick lookup
- **Database Persistence**: Calls are persisted to PostgreSQL when ended

## FreeSWITCH Integration

The dialer integrates with FreeSWITCH via ESL:

1. **Event Subscription**: Subscribes to channel lifecycle events
2. **Call Origination**: Uses `bgapi originate` for non-blocking calls
3. **Call Control**: Full control over channels (bridge, transfer, hangup)
4. **Variable Passing**: Passes NexusDialer metadata as channel variables

## Monitoring and Metrics

Each dialer tracks real-time metrics:

**Predictive Dialer**:
- Total calls, answered calls, abandoned calls
- Available/busy agents
- Current dial ratio
- Abandon rate, answer rate
- Average talk time

**Progressive Dialer**:
- Total calls, answered calls, connected calls
- Available/busy agents
- Calls waiting for agents

**Preview Dialer**:
- Total previews, accepted/rejected/skipped
- Total calls initiated
- Active agents

Access metrics via the campaign status endpoint:

```bash
GET /api/v1/campaigns/:campaignId/status
```

## Error Handling

The dialer includes comprehensive error handling:

- **Auto-Reconnect**: FreeSWITCH connection auto-reconnects on failure
- **Graceful Shutdown**: Stops all campaigns and disconnects cleanly
- **Error Events**: Emits error events for monitoring
- **Logging**: Structured logging with Pino

## Development

### Project Structure

```
src/
├── freeswitch/
│   ├── client.ts          # ESL connection manager
│   └── commands.ts        # FreeSWITCH command helpers
├── dialer/
│   ├── predictive.ts      # Predictive dialer algorithm
│   ├── progressive.ts     # Progressive dialer
│   ├── preview.ts         # Preview dialer
│   └── manager.ts         # Dialer coordinator
├── services/
│   └── call-service.ts    # Call state management
├── routes/
│   └── calls.ts           # API routes
└── index.ts               # Main entry point
```

### Adding a New Dialing Mode

1. Create a new dialer class extending `EventEmitter`
2. Implement `start()` and `stop()` methods
3. Implement dialing logic in a loop or event-driven manner
4. Emit events for call lifecycle
5. Add to `DialerManager` switch statement

### Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

## Production Deployment

### Requirements

- Node.js 18+
- FreeSWITCH 1.10+
- Redis 6+
- Kafka 3+
- PostgreSQL 14+

### Scaling

- **Horizontal Scaling**: Run multiple instances behind a load balancer
- **Campaign Distribution**: Distribute campaigns across instances
- **Redis Cluster**: Use Redis cluster for high availability
- **Kafka Partitions**: Scale event processing with partitions

### Monitoring

Monitor these metrics:

- FreeSWITCH connection status
- Active campaigns count
- Calls per second
- Agent utilization
- Abandon rates
- System resource usage

## License

Proprietary - NexusDialer
