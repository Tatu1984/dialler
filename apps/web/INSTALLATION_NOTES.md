# Installation Notes - Supervisor Dashboard

## Required Package Installation

The Supervisor Dashboard uses the `@radix-ui/react-progress` component which needs to be installed:

```bash
cd /Users/sudipto/Desktop/projects/dialler/apps/web
npm install @radix-ui/react-progress
```

## Files Created

### UI Components (shadcn/ui compatible)
1. `/src/components/ui/badge.tsx` - Badge component with multiple variants
2. `/src/components/ui/avatar.tsx` - Avatar component with image and fallback
3. `/src/components/ui/progress.tsx` - Progress bar component
4. `/src/components/ui/select.tsx` - Select dropdown component
5. `/src/components/ui/table.tsx` - Table components (Table, TableHeader, TableBody, etc.)
6. `/src/components/ui/tabs.tsx` - Tabs component for navigation

### Supervisor Dashboard Pages
1. `/src/app/(dashboard)/supervisor/page.tsx` - Main dashboard
2. `/src/app/(dashboard)/supervisor/agents/page.tsx` - Agent management
3. `/src/app/(dashboard)/supervisor/queues/page.tsx` - Queue monitoring
4. `/src/app/(dashboard)/supervisor/wallboard/page.tsx` - Wallboard display

### Supervisor Dashboard Components
1. `/src/app/(dashboard)/supervisor/components/agent-card.tsx` - Agent status card
2. `/src/app/(dashboard)/supervisor/components/queue-widget.tsx` - Queue status widget
3. `/src/app/(dashboard)/supervisor/components/live-calls-table.tsx` - Active calls table

### Documentation
1. `/src/app/(dashboard)/supervisor/README.md` - Complete documentation

## Quick Start

1. Install the required package:
   ```bash
   npm install @radix-ui/react-progress
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Navigate to:
   - Main Dashboard: `http://localhost:3000/supervisor`
   - Agent Management: `http://localhost:3000/supervisor/agents`
   - Queue Monitoring: `http://localhost:3000/supervisor/queues`
   - Wallboard: `http://localhost:3000/supervisor/wallboard`

## Features Included

- Real-time dashboard with auto-refresh
- Agent grid and table views
- Queue monitoring with service level gauges
- Live calls table with supervisor controls
- Wallboard for large displays
- Mock data for testing
- Responsive design
- Dark mode support (via next-themes)
- TypeScript types
- Accessible components (Radix UI)

## Integration Points

The dashboard is ready for backend integration. Key areas to connect:

1. **WebSocket/Socket.io**: Replace mock data with real-time events
2. **API Calls**: Implement actual supervisor actions (listen, whisper, barge, force logout)
3. **Authentication**: Add supervisor permission checks
4. **State Management**: The dashboard uses local state - consider connecting to Zustand stores

## Known Considerations

- All supervisor actions currently log to console - implement actual backend calls
- Mock data is static except on wallboard page which simulates updates
- Filters don't persist across page refreshes
- No error boundaries implemented yet
- Avatar images use placeholders
