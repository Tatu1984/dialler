# Supervisor Dashboard - NexusDialer

A comprehensive real-time supervisor dashboard for contact center monitoring and management.

## Directory Structure

```
supervisor/
├── page.tsx                      # Main dashboard with overview, agents, and active calls tabs
├── agents/
│   └── page.tsx                  # Agent management page with grid/table views
├── queues/
│   └── page.tsx                  # Queue monitoring with detailed metrics
├── wallboard/
│   └── page.tsx                  # Large-format wallboard display
└── components/
    ├── agent-card.tsx            # Individual agent status card
    ├── queue-widget.tsx          # Queue status widget
    └── live-calls-table.tsx      # Active calls table
```

## Pages

### 1. Main Dashboard (`page.tsx`)
**Route:** `/supervisor`

Features:
- Real-time key metrics (Total Agents, Calls Waiting, Service Level, Active Calls)
- Auto-refresh with live clock
- Tabbed interface:
  - **Overview**: Queue status widgets + Agent grid
  - **Agents**: Full agent listing with filters
  - **Active Calls**: Live calls table with listen/whisper/barge controls
- Quick actions dropdown (Broadcast, Alerts, Reports, Settings)

### 2. Agent Management (`agents/page.tsx`)
**Route:** `/supervisor/agents`

Features:
- Summary statistics (Total, Available, On Call, On Break)
- Search and filter by:
  - Agent name
  - Status (Available, On Call, Wrap-up, Break, Offline)
  - Team (Sales, Support)
- Dual view modes:
  - **Grid View**: Agent cards with full details
  - **Table View**: Compact tabular format
- Performance metrics per agent:
  - Calls handled today
  - Talk time
  - Average handle time
  - Customer satisfaction
  - Schedule adherence
  - Conversion rate (for sales agents)

### 3. Queue Monitoring (`queues/page.tsx`)
**Route:** `/supervisor/queues`

Features:
- Queue summary cards showing:
  - Total queues and calls waiting
  - Total calls handled today
  - Total abandoned calls
  - Average service level
- Individual queue widgets with:
  - Calls waiting (prominent display)
  - Longest wait time
  - Agent availability breakdown
  - Service level gauge with color-coded thresholds
  - Average handle time
- Detailed queue table with:
  - Priority levels
  - Routing strategies
  - Service level progress
  - Abandon rates
- Queue configuration summary
- Active queue alerts

### 4. Wallboard (`wallboard/page.tsx`)
**Route:** `/supervisor/wallboard`

Features:
- Large-format metrics display
- Real-time auto-updating (every 3 seconds)
- Primary metrics:
  - **Calls Waiting**: Extra-large display with pulsing animation when > 10
  - **Service Level**: Color-coded gauge (Green/Yellow/Red)
  - **Agent Status**: Available/On Call/Break breakdown
- Secondary metrics:
  - Average wait time
  - Average handle time
  - Calls handled today
  - Abandon rate
- Queue performance breakdown
- Today's performance summary
- Fullscreen mode support

## Components

### AgentCard (`components/agent-card.tsx`)
Displays individual agent status with:
- Avatar with status indicator
- Current call information (if on call)
- Daily statistics (calls, talk time, avg AHT)
- Action dropdown:
  - Listen (monitor call)
  - Whisper (coach agent)
  - Barge In (join call)
  - Force Break
  - Force Logout

Props:
```typescript
interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    avatar?: string;
    status: AgentStatus;
    currentCall?: {
      phoneNumber: string;
      duration: string;
      queue: string;
    };
    stats: {
      callsToday: number;
      talkTime: string;
      avgHandleTime: string;
    };
  };
  onListen?: (agentId: string) => void;
  onWhisper?: (agentId: string) => void;
  onBarge?: (agentId: string) => void;
  onForceBreak?: (agentId: string) => void;
  onForceLogout?: (agentId: string) => void;
}
```

### QueueWidget (`components/queue-widget.tsx`)
Queue status display with:
- Color-coded border based on service level
- Large calls waiting count
- Longest wait time
- Agent availability breakdown
- Service level gauge with progress bar
- Average handle time
- Trend indicator (up/down/stable)

Props:
```typescript
interface QueueWidgetProps {
  queue: {
    id: string;
    name: string;
    callsWaiting: number;
    longestWait: string;
    agentsAvailable: number;
    agentsBusy: number;
    agentsTotal: number;
    serviceLevel: number;
    serviceLevelTarget: number;
    avgHandleTime: string;
    trend: 'up' | 'down' | 'stable';
  };
  onClick?: () => void;
}
```

### LiveCallsTable (`components/live-calls-table.tsx`)
Active calls table showing:
- Agent name
- Customer phone number
- Queue
- Direction (inbound/outbound)
- Status (talking/hold/wrap-up/ringing)
- Duration
- Quick action buttons (Listen/Whisper/Barge)
- Action dropdown menu

Props:
```typescript
interface LiveCallsTableProps {
  calls: LiveCall[];
  onListen?: (callId: string) => void;
  onWhisper?: (callId: string) => void;
  onBarge?: (callId: string) => void;
  onDisconnect?: (callId: string) => void;
}
```

## Status Types

### Agent Status
- `available` - Ready to take calls (Green)
- `on-call` - Currently on a call (Blue)
- `wrap-up` - Post-call work (Yellow)
- `break` - On break (Gray)
- `offline` - Not logged in (Red)
- `away` - Away from desk (Orange)

### Call Status
- `talking` - Active conversation
- `hold` - Customer on hold
- `wrap-up` - Post-call processing
- `ringing` - Call connecting

## Mock Data

All pages include comprehensive mock data for demonstration:
- 6-8 agents with various statuses
- 3-4 queues with different metrics
- Active calls with realistic durations
- Performance statistics

## Real-time Features

The dashboard is designed to work with real-time WebSocket updates:
- Auto-refresh toggle
- Live clock display
- Simulated real-time updates on wallboard
- Ready for integration with Socket.io or similar

## Styling & Theming

- Built with Tailwind CSS
- Uses shadcn/ui components
- Responsive design (mobile, tablet, desktop)
- Color-coded thresholds:
  - Green: Good performance (≥90%)
  - Yellow: Warning (70-89%)
  - Red: Critical (<70%)

## Next Steps for Integration

1. **WebSocket Integration**
   - Connect to real-time event streams
   - Update metrics on agent state changes
   - Update call status in real-time

2. **API Integration**
   - Replace mock data with API calls
   - Implement supervisor actions (listen, whisper, barge)
   - Add filter persistence

3. **Authentication & Authorization**
   - Verify supervisor permissions
   - Restrict actions based on role

4. **Additional Features**
   - Call recording playback
   - Agent chat/messaging
   - Historical reporting
   - Alert configuration
   - Wallboard customization
   - Export capabilities

## Dependencies

All required UI components are included:
- `@radix-ui/react-avatar`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-progress`
- `@radix-ui/react-select`
- `@radix-ui/react-tabs`
- `lucide-react` (icons)
- `class-variance-authority`
- `tailwind-merge`

Note: You may need to install `@radix-ui/react-progress` if not already installed:
```bash
npm install @radix-ui/react-progress
```
