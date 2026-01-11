import { Router } from 'express';
import { createLogger } from '../utils/logger';
import { mediaServer } from '../webrtc/media-server';
import { peerManager } from '../webrtc/peer-manager';
import { sipGateway } from '../sip/gateway';

const logger = createLogger('webrtc-routes');
const router = Router();

// ============================================
// Health Check
// ============================================

router.get('/health', async (req, res) => {
  try {
    const mediaStats = await mediaServer.getStats();
    const peerStats = peerManager.getStats();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats: {
        media: mediaStats,
        peers: peerStats,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    res.status(503).json({
      status: 'unhealthy',
      error: 'Service unavailable',
    });
  }
});

// ============================================
// Router Capabilities
// ============================================

router.get('/capabilities/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const capabilities = await mediaServer.getRouterCapabilities(tenantId);

    res.json({
      success: true,
      capabilities,
    });
  } catch (error) {
    logger.error({ error, tenantId: req.params.tenantId }, 'Failed to get router capabilities');
    res.status(500).json({
      success: false,
      error: 'Failed to get router capabilities',
    });
  }
});

// ============================================
// Active Sessions
// ============================================

router.get('/sessions', async (req, res) => {
  try {
    const { agentId, tenantId } = req.query;

    let sessions = peerManager.getActiveCalls();

    if (agentId) {
      sessions = sessions.filter((s) => s.agentId === agentId);
    }

    if (tenantId) {
      sessions = sessions.filter((s) => s.tenantId === tenantId);
    }

    res.json({
      success: true,
      sessions: sessions.map((session) => ({
        id: session.id,
        callId: session.callId,
        agentId: session.agentId,
        tenantId: session.tenantId,
        direction: session.direction,
        phoneNumber: session.phoneNumber,
        state: session.state,
        startTime: session.startTime,
        answerTime: session.answerTime,
        holdState: session.holdState,
        muteState: session.muteState,
      })),
      count: sessions.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get active sessions');
    res.status(500).json({
      success: false,
      error: 'Failed to get active sessions',
    });
  }
});

// ============================================
// Session Details
// ============================================

router.get('/sessions/:callId', async (req, res) => {
  try {
    const { callId } = req.params;

    const session = peerManager.getCallSession(callId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        callId: session.callId,
        agentId: session.agentId,
        tenantId: session.tenantId,
        direction: session.direction,
        phoneNumber: session.phoneNumber,
        state: session.state,
        startTime: session.startTime,
        answerTime: session.answerTime,
        endTime: session.endTime,
        holdState: session.holdState,
        muteState: session.muteState,
        recordingEnabled: session.recordingEnabled,
        campaignId: session.campaignId,
        leadId: session.leadId,
        queueId: session.queueId,
      },
    });
  } catch (error) {
    logger.error({ error, callId: req.params.callId }, 'Failed to get session details');
    res.status(500).json({
      success: false,
      error: 'Failed to get session details',
    });
  }
});

// ============================================
// Statistics
// ============================================

router.get('/stats', async (req, res) => {
  try {
    const mediaStats = await mediaServer.getStats();
    const peerStats = peerManager.getStats();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      media: mediaStats,
      peers: peerStats,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get statistics');
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
    });
  }
});

// ============================================
// Agent Statistics
// ============================================

router.get('/stats/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;

    const activeCalls = peerManager.getActiveCallsForAgent(agentId);
    const peer = peerManager.getPeerByAgentId(agentId);

    res.json({
      success: true,
      agentId,
      isConnected: !!peer,
      activeCalls: activeCalls.length,
      calls: activeCalls.map((call) => ({
        callId: call.callId,
        direction: call.direction,
        phoneNumber: call.phoneNumber,
        state: call.state,
        duration: call.answerTime
          ? Math.floor((Date.now() - call.answerTime.getTime()) / 1000)
          : 0,
      })),
    });
  } catch (error) {
    logger.error({ error, agentId: req.params.agentId }, 'Failed to get agent statistics');
    res.status(500).json({
      success: false,
      error: 'Failed to get agent statistics',
    });
  }
});

// ============================================
// Terminate Session (Admin)
// ============================================

router.post('/sessions/:callId/terminate', async (req, res) => {
  try {
    const { callId } = req.params;

    const session = peerManager.getCallSession(callId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Hangup SIP session if exists
    if (session.sipSessionId) {
      await sipGateway.hangup(session.sipSessionId);
    }

    // End call session
    peerManager.endCallSession(callId);

    logger.info({ callId, adminAction: true }, 'Session terminated by admin');

    res.json({
      success: true,
      message: 'Session terminated',
    });
  } catch (error) {
    logger.error({ error, callId: req.params.callId }, 'Failed to terminate session');
    res.status(500).json({
      success: false,
      error: 'Failed to terminate session',
    });
  }
});

// ============================================
// Server Information
// ============================================

router.get('/info', async (req, res) => {
  try {
    const mediaStats = await mediaServer.getStats();
    const peerStats = peerManager.getStats();

    res.json({
      success: true,
      version: '0.1.0',
      service: 'webrtc-gateway',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      stats: {
        media: mediaStats,
        peers: peerStats,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get server info');
    res.status(500).json({
      success: false,
      error: 'Failed to get server info',
    });
  }
});

// ============================================
// Error Handler
// ============================================

router.use((err: Error, req: any, res: any, next: any) => {
  logger.error({ error: err, path: req.path }, 'Route error');
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

export default router;
