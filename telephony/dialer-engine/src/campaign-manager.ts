import { EventEmitter } from 'events';
import { CallManager } from './call-manager';
import type { Logger } from 'pino';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'stopped';
  dialMode: 'preview' | 'progressive' | 'predictive';
  dialRatio: number;
  maxConcurrentCalls: number;
  callerId: string;
  callerIdName: string;
  leadListId: string;
  wrapUpTime: number;
  dropRate: number;
  answerTimeout: number;
}

interface Lead {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  callAttempts: number;
  status: string;
}

interface Agent {
  id: string;
  status: 'available' | 'busy' | 'wrap_up' | 'offline';
  currentCallId?: string;
}

export class CampaignManager extends EventEmitter {
  private callManager: CallManager;
  private logger: Logger;
  private activeCampaigns: Map<string, Campaign> = new Map();
  private campaignLeads: Map<string, Lead[]> = new Map();
  private campaignAgents: Map<string, Agent[]> = new Map();
  private dialingTimers: Map<string, NodeJS.Timeout> = new Map();
  private campaignStats: Map<string, CampaignStats> = new Map();

  constructor(callManager: CallManager, logger: Logger) {
    super();
    this.callManager = callManager;
    this.logger = logger.child({ component: 'CampaignManager' });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.callManager.on('call:answered', (event) => {
      this.handleCallAnswered(event);
    });

    this.callManager.on('call:hangup', (event) => {
      this.handleCallHangup(event);
    });

    this.callManager.on('call:connected', (event) => {
      this.handleCallConnected(event);
    });
  }

  async startCampaign(campaignId: string, campaign: Campaign, leads: Lead[], agents: Agent[]): Promise<void> {
    this.logger.info({ campaignId, dialMode: campaign.dialMode }, 'Starting campaign');

    this.activeCampaigns.set(campaignId, { ...campaign, status: 'active' });
    this.campaignLeads.set(campaignId, leads);
    this.campaignAgents.set(campaignId, agents);
    this.campaignStats.set(campaignId, {
      totalCalls: 0,
      answeredCalls: 0,
      connectedCalls: 0,
      abandonedCalls: 0,
      failedCalls: 0,
      totalTalkTime: 0,
      avgWaitTime: 0,
    });

    // Start dialing based on mode
    this.startDialing(campaignId);
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    const campaign = this.activeCampaigns.get(campaignId);
    if (!campaign) return;

    this.logger.info({ campaignId }, 'Pausing campaign');
    campaign.status = 'paused';
    this.stopDialingTimer(campaignId);
  }

  async resumeCampaign(campaignId: string): Promise<void> {
    const campaign = this.activeCampaigns.get(campaignId);
    if (!campaign) return;

    this.logger.info({ campaignId }, 'Resuming campaign');
    campaign.status = 'active';
    this.startDialing(campaignId);
  }

  async stopCampaign(campaignId: string): Promise<void> {
    this.logger.info({ campaignId }, 'Stopping campaign');

    this.stopDialingTimer(campaignId);
    this.activeCampaigns.delete(campaignId);
    this.campaignLeads.delete(campaignId);
    this.campaignAgents.delete(campaignId);

    const stats = this.campaignStats.get(campaignId);
    this.emit('campaign:stopped', { campaignId, stats });
    this.campaignStats.delete(campaignId);
  }

  private startDialing(campaignId: string): void {
    const campaign = this.activeCampaigns.get(campaignId);
    if (!campaign || campaign.status !== 'active') return;

    const dialInterval = this.calculateDialInterval(campaign);

    const timer = setInterval(() => {
      this.dialNextLeads(campaignId);
    }, dialInterval);

    this.dialingTimers.set(campaignId, timer);

    // Initial dial
    this.dialNextLeads(campaignId);
  }

  private stopDialingTimer(campaignId: string): void {
    const timer = this.dialingTimers.get(campaignId);
    if (timer) {
      clearInterval(timer);
      this.dialingTimers.delete(campaignId);
    }
  }

  private calculateDialInterval(campaign: Campaign): number {
    switch (campaign.dialMode) {
      case 'predictive':
        return 500; // Aggressive dialing
      case 'progressive':
        return 1000; // Moderate pace
      case 'preview':
        return 5000; // Wait for agent to preview
      default:
        return 2000;
    }
  }

  private async dialNextLeads(campaignId: string): Promise<void> {
    const campaign = this.activeCampaigns.get(campaignId);
    if (!campaign || campaign.status !== 'active') return;

    const agents = this.campaignAgents.get(campaignId) || [];
    const leads = this.campaignLeads.get(campaignId) || [];
    const stats = this.campaignStats.get(campaignId);

    const availableAgents = agents.filter(a => a.status === 'available');
    if (availableAgents.length === 0 && campaign.dialMode !== 'predictive') {
      return; // No agents available for non-predictive modes
    }

    // Calculate how many calls to make
    const activeCalls = this.callManager.getActiveCalls(campaignId);
    const callsToMake = this.calculateCallsToMake(campaign, availableAgents.length, activeCalls.length);

    if (callsToMake <= 0) return;

    // Get next leads to dial
    const nextLeads = leads
      .filter(l => l.status === 'new' || l.status === 'retry')
      .slice(0, callsToMake);

    for (const lead of nextLeads) {
      try {
        // Update lead status
        lead.status = 'dialing';
        lead.callAttempts++;

        // Determine agent assignment
        let assignedAgent: Agent | undefined;
        if (campaign.dialMode === 'preview' || campaign.dialMode === 'progressive') {
          assignedAgent = availableAgents.shift();
          if (assignedAgent) {
            assignedAgent.status = 'busy';
          }
        }

        // Originate call
        await this.callManager.originate({
          campaignId,
          leadId: lead.id,
          destination: lead.phoneNumber,
          callerId: campaign.callerId,
          callerIdName: campaign.callerIdName,
          agentId: assignedAgent?.id,
          timeout: campaign.answerTimeout,
        });

        if (stats) {
          stats.totalCalls++;
        }

        this.logger.info({ campaignId, leadId: lead.id, phone: lead.phoneNumber }, 'Call originated');

      } catch (error) {
        this.logger.error({ error, campaignId, leadId: lead.id }, 'Failed to originate call');
        lead.status = 'failed';
        if (stats) {
          stats.failedCalls++;
        }
      }
    }
  }

  private calculateCallsToMake(campaign: Campaign, availableAgents: number, activeCalls: number): number {
    const remainingCapacity = campaign.maxConcurrentCalls - activeCalls;

    if (remainingCapacity <= 0) return 0;

    switch (campaign.dialMode) {
      case 'predictive':
        // Dial more calls than available agents based on dial ratio
        return Math.min(
          Math.ceil(availableAgents * campaign.dialRatio),
          remainingCapacity
        );

      case 'progressive':
        // One call per available agent
        return Math.min(availableAgents, remainingCapacity);

      case 'preview':
        // Agent must request the call
        return 0; // Handled separately via preview request

      default:
        return 0;
    }
  }

  private handleCallAnswered(event: { campaignId: string; leadId: string; uuid: string }): void {
    const stats = this.campaignStats.get(event.campaignId);
    if (stats) {
      stats.answeredCalls++;
    }
    this.emit('call:answered', event);
  }

  private handleCallConnected(event: { campaignId: string; leadId: string; agentId: string; uuid: string }): void {
    const stats = this.campaignStats.get(event.campaignId);
    if (stats) {
      stats.connectedCalls++;
    }

    // Update agent status
    const agents = this.campaignAgents.get(event.campaignId);
    const agent = agents?.find(a => a.id === event.agentId);
    if (agent) {
      agent.status = 'busy';
      agent.currentCallId = event.uuid;
    }

    this.emit('call:connected', event);
  }

  private handleCallHangup(event: {
    campaignId: string;
    leadId: string;
    agentId?: string;
    uuid: string;
    hangupCause: string;
    duration: number;
  }): void {
    const stats = this.campaignStats.get(event.campaignId);
    const leads = this.campaignLeads.get(event.campaignId);
    const lead = leads?.find(l => l.id === event.leadId);

    // Update lead status based on hangup cause
    if (lead) {
      switch (event.hangupCause) {
        case 'NORMAL_CLEARING':
          lead.status = 'completed';
          break;
        case 'NO_ANSWER':
        case 'NO_USER_RESPONSE':
          lead.status = 'no_answer';
          break;
        case 'USER_BUSY':
          lead.status = 'busy';
          break;
        case 'CALL_REJECTED':
        case 'ORIGINATOR_CANCEL':
          lead.status = 'abandoned';
          if (stats) stats.abandonedCalls++;
          break;
        default:
          lead.status = 'failed';
          if (stats) stats.failedCalls++;
      }
    }

    // Update agent status
    if (event.agentId) {
      const agents = this.campaignAgents.get(event.campaignId);
      const agent = agents?.find(a => a.id === event.agentId);
      if (agent) {
        const campaign = this.activeCampaigns.get(event.campaignId);
        agent.status = 'wrap_up';
        agent.currentCallId = undefined;

        // Set wrap-up timer
        if (campaign) {
          setTimeout(() => {
            agent.status = 'available';
            this.emit('agent:available', { campaignId: event.campaignId, agentId: event.agentId });
          }, campaign.wrapUpTime * 1000);
        }
      }
    }

    // Update stats
    if (stats && event.duration > 0) {
      stats.totalTalkTime += event.duration;
    }

    this.emit('call:hangup', event);
  }

  // Preview mode: agent requests a specific lead
  async previewDial(campaignId: string, agentId: string, leadId: string): Promise<void> {
    const campaign = this.activeCampaigns.get(campaignId);
    const leads = this.campaignLeads.get(campaignId);
    const agents = this.campaignAgents.get(campaignId);

    if (!campaign || !leads || !agents) {
      throw new Error('Campaign not found');
    }

    const lead = leads.find(l => l.id === leadId);
    const agent = agents.find(a => a.id === agentId);

    if (!lead || !agent) {
      throw new Error('Lead or agent not found');
    }

    if (agent.status !== 'available') {
      throw new Error('Agent not available');
    }

    agent.status = 'busy';
    lead.status = 'dialing';
    lead.callAttempts++;

    await this.callManager.originate({
      campaignId,
      leadId,
      destination: lead.phoneNumber,
      callerId: campaign.callerId,
      callerIdName: campaign.callerIdName,
      agentId,
      timeout: campaign.answerTimeout,
    });
  }

  getCampaignStats(campaignId: string): CampaignStats | undefined {
    return this.campaignStats.get(campaignId);
  }

  updateAgentStatus(campaignId: string, agentId: string, status: Agent['status']): void {
    const agents = this.campaignAgents.get(campaignId);
    const agent = agents?.find(a => a.id === agentId);
    if (agent) {
      agent.status = status;
    }
  }
}

interface CampaignStats {
  totalCalls: number;
  answeredCalls: number;
  connectedCalls: number;
  abandonedCalls: number;
  failedCalls: number;
  totalTalkTime: number;
  avgWaitTime: number;
}
