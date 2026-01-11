import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pino from 'pino';
import { DialerManager } from '../dialer/manager';
import { CallService } from '../services/call-service';

const logger = pino({ name: 'calls-routes' });

const router = Router();

// Validation schemas
const startCampaignSchema = z.object({
  campaignId: z.string().uuid(),
});

const stopCampaignSchema = z.object({
  campaignId: z.string().uuid(),
});

const requestLeadSchema = z.object({
  campaignId: z.string().uuid(),
  agentId: z.string().uuid(),
});

const previewActionSchema = z.object({
  campaignId: z.string().uuid(),
  previewId: z.string(),
  reason: z.string().optional(),
});

const updateAgentStatusSchema = z.object({
  agentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  state: z.enum(['available', 'on_call', 'wrap_up', 'break', 'offline']),
  currentCallId: z.string().uuid().optional(),
});

/**
 * Initialize routes with dependencies
 */
export function initializeCallRoutes(dialerManager: DialerManager, callService: CallService): Router {
  /**
   * POST /campaigns/start
   * Start a campaign
   */
  router.post('/campaigns/start', async (req: Request, res: Response) => {
    try {
      const { campaignId } = startCampaignSchema.parse(req.body);

      await dialerManager.startCampaign(campaignId);

      logger.info({ campaignId }, 'Campaign started via API');

      res.json({
        success: true,
        message: 'Campaign started successfully',
        campaignId,
      });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error starting campaign');

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /campaigns/stop
   * Stop a campaign
   */
  router.post('/campaigns/stop', async (req: Request, res: Response) => {
    try {
      const { campaignId } = stopCampaignSchema.parse(req.body);

      await dialerManager.stopCampaign(campaignId);

      logger.info({ campaignId }, 'Campaign stopped via API');

      res.json({
        success: true,
        message: 'Campaign stopped successfully',
        campaignId,
      });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error stopping campaign');

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /campaigns/:campaignId/status
   * Get campaign status
   */
  router.get('/campaigns/:campaignId/status', async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;

      const status = dialerManager.getCampaignStatus(campaignId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'Campaign not running',
        });
      }

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error({ error, campaignId: req.params.campaignId }, 'Error getting campaign status');

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /campaigns/active
   * Get all active campaigns
   */
  router.get('/campaigns/active', async (req: Request, res: Response) => {
    try {
      const campaigns = dialerManager.getActiveCampaigns();

      res.json({
        success: true,
        data: {
          campaigns,
          count: campaigns.length,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Error getting active campaigns');

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /preview/request
   * Request next lead for preview (Preview mode only)
   */
  router.post('/preview/request', async (req: Request, res: Response) => {
    try {
      const { campaignId, agentId } = requestLeadSchema.parse(req.body);

      const preview = await dialerManager.requestNextLead(campaignId, agentId);

      if (!preview) {
        return res.status(404).json({
          success: false,
          error: 'No leads available',
        });
      }

      logger.info({ campaignId, agentId, previewId: preview.id }, 'Preview requested via API');

      res.json({
        success: true,
        data: preview,
      });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error requesting preview');

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /preview/accept
   * Accept a preview and initiate call
   */
  router.post('/preview/accept', async (req: Request, res: Response) => {
    try {
      const { campaignId, previewId } = previewActionSchema.parse(req.body);

      await dialerManager.acceptPreview(campaignId, previewId);

      logger.info({ campaignId, previewId }, 'Preview accepted via API');

      res.json({
        success: true,
        message: 'Preview accepted, call initiated',
      });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error accepting preview');

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /preview/reject
   * Reject a preview
   */
  router.post('/preview/reject', async (req: Request, res: Response) => {
    try {
      const { campaignId, previewId, reason } = previewActionSchema.parse(req.body);

      await dialerManager.rejectPreview(campaignId, previewId, reason);

      logger.info({ campaignId, previewId, reason }, 'Preview rejected via API');

      res.json({
        success: true,
        message: 'Preview rejected',
      });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error rejecting preview');

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /preview/skip
   * Skip a preview
   */
  router.post('/preview/skip', async (req: Request, res: Response) => {
    try {
      const { campaignId, previewId } = previewActionSchema.parse(req.body);

      await dialerManager.skipPreview(campaignId, previewId);

      logger.info({ campaignId, previewId }, 'Preview skipped via API');

      res.json({
        success: true,
        message: 'Preview skipped',
      });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error skipping preview');

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /calls/:callId
   * Get call details
   */
  router.get('/calls/:callId', async (req: Request, res: Response) => {
    try {
      const { callId } = req.params;

      const call = await callService.getCall(callId);

      if (!call) {
        return res.status(404).json({
          success: false,
          error: 'Call not found',
        });
      }

      res.json({
        success: true,
        data: call,
      });
    } catch (error) {
      logger.error({ error, callId: req.params.callId }, 'Error getting call');

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /calls/active
   * Get all active calls
   */
  router.get('/calls/active', async (req: Request, res: Response) => {
    try {
      const calls = await callService.getActiveCalls();

      res.json({
        success: true,
        data: {
          calls,
          count: calls.length,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Error getting active calls');

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /campaigns/:campaignId/calls
   * Get active calls for a campaign
   */
  router.get('/campaigns/:campaignId/calls', async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;

      const calls = await callService.getCampaignActiveCalls(campaignId);

      res.json({
        success: true,
        data: {
          campaignId,
          calls,
          count: calls.length,
        },
      });
    } catch (error) {
      logger.error({ error, campaignId: req.params.campaignId }, 'Error getting campaign calls');

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /agents/status
   * Update agent status
   */
  router.post('/agents/status', async (req: Request, res: Response) => {
    try {
      const { agentId, tenantId, state, currentCallId } = updateAgentStatusSchema.parse(req.body);

      await callService.updateAgentStatus(agentId, tenantId, state, currentCallId);

      logger.info({ agentId, state }, 'Agent status updated via API');

      res.json({
        success: true,
        message: 'Agent status updated',
      });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error updating agent status');

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /agents/:agentId/status
   * Get agent status
   */
  router.get('/agents/:agentId/status', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;

      const status = await callService.getAgentStatus(agentId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'Agent status not found',
        });
      }

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error({ error, agentId: req.params.agentId }, 'Error getting agent status');

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /agents/available
   * Get available agents for a tenant
   */
  router.get('/agents/available', async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'tenantId query parameter is required',
        });
      }

      const agents = await callService.getAvailableAgents(tenantId);

      res.json({
        success: true,
        data: {
          agents,
          count: agents.length,
        },
      });
    } catch (error) {
      logger.error({ error, tenantId: req.query.tenantId }, 'Error getting available agents');

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /health
   * Health check endpoint
   */
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

export default router;
