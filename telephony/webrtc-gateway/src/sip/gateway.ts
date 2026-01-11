import { UserAgent, Registerer, Inviter, Invitation, SessionState } from 'sip.js';
import type { Session } from 'sip.js';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { config } from '../config';
import type { SIPSession, SIPConfig } from '../types';
import EventEmitter from 'events';

const logger = createLogger('sip-gateway');

export interface SIPGatewayEvents {
  'session:created': (session: SIPSession) => void;
  'session:established': (sessionId: string) => void;
  'session:terminated': (sessionId: string, reason?: string) => void;
  'session:failed': (sessionId: string, error: string) => void;
  'call:ringing': (sessionId: string) => void;
  'call:answered': (sessionId: string) => void;
  'call:held': (sessionId: string, isOnHold: boolean) => void;
  'dtmf:sent': (sessionId: string, tone: string) => void;
  'error': (error: Error) => void;
}

export class SIPGateway extends EventEmitter {
  private userAgents: Map<string, UserAgent> = new Map();
  private registerers: Map<string, Registerer> = new Map();
  private sessions: Map<string, SIPSession> = new Map();
  private sipSessions: Map<string, Session> = new Map();

  constructor() {
    super();
  }

  async registerAgent(
    agentId: string,
    tenantId: string,
    sipConfig: SIPConfig
  ): Promise<void> {
    try {
      // Check if already registered
      if (this.userAgents.has(agentId)) {
        logger.warn({ agentId }, 'Agent already registered');
        return;
      }

      const userAgent = new UserAgent({
        uri: UserAgent.makeURI(sipConfig.uri),
        transportOptions: {
          server: sipConfig.wsServer || config.freeswitch.wsUrl,
        },
        authorizationUsername: sipConfig.username,
        authorizationPassword: sipConfig.password,
        displayName: sipConfig.displayName || `Agent ${agentId}`,
        logLevel: 'warn',
        delegate: {
          onInvite: (invitation: Invitation) => {
            this.handleIncomingCall(agentId, tenantId, invitation);
          },
        },
      });

      await userAgent.start();

      const registerer = new Registerer(userAgent);

      registerer.stateChange.addListener((state) => {
        logger.info(
          {
            agentId,
            state,
          },
          'SIP registration state changed'
        );
      });

      await registerer.register();

      this.userAgents.set(agentId, userAgent);
      this.registerers.set(agentId, registerer);

      logger.info(
        {
          agentId,
          tenantId,
          uri: sipConfig.uri,
        },
        'Agent registered to SIP server'
      );
    } catch (error) {
      logger.error({ error, agentId }, 'Failed to register agent');
      throw error;
    }
  }

  async unregisterAgent(agentId: string): Promise<void> {
    try {
      const registerer = this.registerers.get(agentId);
      if (registerer) {
        await registerer.unregister();
        this.registerers.delete(agentId);
      }

      const userAgent = this.userAgents.get(agentId);
      if (userAgent) {
        await userAgent.stop();
        this.userAgents.delete(agentId);
      }

      logger.info({ agentId }, 'Agent unregistered from SIP server');
    } catch (error) {
      logger.error({ error, agentId }, 'Failed to unregister agent');
    }
  }

  async makeCall(
    agentId: string,
    tenantId: string,
    callId: string,
    phoneNumber: string
  ): Promise<string> {
    try {
      const userAgent = this.userAgents.get(agentId);
      if (!userAgent) {
        throw new Error('Agent not registered');
      }

      const target = UserAgent.makeURI(`sip:${phoneNumber}@${config.freeswitch.host}`);
      if (!target) {
        throw new Error('Invalid phone number');
      }

      const inviter = new Inviter(userAgent, target, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false,
          },
        },
      });

      const sessionId = uuidv4();

      const sipSession: SIPSession = {
        id: sessionId,
        agentId,
        tenantId,
        callId,
        direction: 'outbound',
        remoteIdentity: phoneNumber,
        localIdentity: agentId,
        state: 'initial',
        startTime: new Date(),
        holdState: false,
        muteState: false,
      };

      this.sessions.set(sessionId, sipSession);
      this.sipSessions.set(sessionId, inviter);

      // Set up session state change handler
      inviter.stateChange.addListener((state: SessionState) => {
        this.handleSessionStateChange(sessionId, state);
      });

      // Send the INVITE
      await inviter.invite({
        requestDelegate: {
          onProgress: () => {
            logger.debug({ sessionId, callId }, 'Call is ringing');
            this.updateSessionState(sessionId, 'establishing');
            this.emit('call:ringing', sessionId);
          },
          onAccept: () => {
            logger.info({ sessionId, callId }, 'Call answered');
            this.updateSessionState(sessionId, 'established');
            this.emit('call:answered', sessionId);
          },
          onReject: (response) => {
            logger.warn(
              { sessionId, callId, status: response.message.statusCode },
              'Call rejected'
            );
            this.updateSessionState(sessionId, 'terminated');
            this.emit('session:failed', sessionId, `Rejected: ${response.message.reasonPhrase}`);
          },
        },
      });

      this.emit('session:created', sipSession);

      logger.info(
        {
          sessionId,
          callId,
          agentId,
          phoneNumber,
        },
        'Outbound call initiated'
      );

      return sessionId;
    } catch (error) {
      logger.error({ error, agentId, phoneNumber }, 'Failed to make call');
      throw error;
    }
  }

  private handleIncomingCall(
    agentId: string,
    tenantId: string,
    invitation: Invitation
  ): void {
    const sessionId = uuidv4();
    const callId = uuidv4();

    const remoteIdentity = invitation.remoteIdentity.uri.toString();

    const sipSession: SIPSession = {
      id: sessionId,
      agentId,
      tenantId,
      callId,
      direction: 'inbound',
      remoteIdentity,
      localIdentity: agentId,
      state: 'initial',
      startTime: new Date(),
      holdState: false,
      muteState: false,
    };

    this.sessions.set(sessionId, sipSession);
    this.sipSessions.set(sessionId, invitation);

    // Set up session state change handler
    invitation.stateChange.addListener((state: SessionState) => {
      this.handleSessionStateChange(sessionId, state);
    });

    this.emit('session:created', sipSession);

    logger.info(
      {
        sessionId,
        callId,
        agentId,
        remoteIdentity,
      },
      'Incoming call received'
    );
  }

  async answerCall(sessionId: string): Promise<void> {
    try {
      const session = this.sipSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (!(session instanceof Invitation)) {
        throw new Error('Not an incoming call');
      }

      await session.accept({
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false,
          },
        },
      });

      this.updateSessionState(sessionId, 'established');

      logger.info({ sessionId }, 'Call answered');
    } catch (error) {
      logger.error({ error, sessionId }, 'Failed to answer call');
      throw error;
    }
  }

  async hangup(sessionId: string): Promise<void> {
    try {
      const session = this.sipSessions.get(sessionId);
      if (!session) {
        logger.warn({ sessionId }, 'Session not found for hangup');
        return;
      }

      switch (session.state) {
        case SessionState.Initial:
        case SessionState.Establishing:
          if (session instanceof Inviter) {
            await session.cancel();
          } else if (session instanceof Invitation) {
            await session.reject();
          }
          break;
        case SessionState.Established:
          await session.bye();
          break;
        default:
          logger.warn({ sessionId, state: session.state }, 'Cannot hangup in current state');
      }

      this.updateSessionState(sessionId, 'terminated');

      logger.info({ sessionId }, 'Call hung up');
    } catch (error) {
      logger.error({ error, sessionId }, 'Failed to hangup call');
      throw error;
    }
  }

  async hold(sessionId: string): Promise<void> {
    try {
      const sipSessionData = this.sessions.get(sessionId);
      if (!sipSessionData) {
        throw new Error('Session not found');
      }

      const session = this.sipSessions.get(sessionId);
      if (!session || session.state !== SessionState.Established) {
        throw new Error('Session not established');
      }

      // Send re-INVITE with sendonly
      const sessionDescriptionHandler = session.sessionDescriptionHandler;
      if (sessionDescriptionHandler) {
        // Modify SDP to set audio to sendonly
        await session.invite({
          requestDelegate: {
            onAccept: () => {
              sipSessionData.holdState = true;
              this.emit('call:held', sessionId, true);
              logger.info({ sessionId }, 'Call placed on hold');
            },
          },
        });
      }
    } catch (error) {
      logger.error({ error, sessionId }, 'Failed to hold call');
      throw error;
    }
  }

  async unhold(sessionId: string): Promise<void> {
    try {
      const sipSessionData = this.sessions.get(sessionId);
      if (!sipSessionData) {
        throw new Error('Session not found');
      }

      const session = this.sipSessions.get(sessionId);
      if (!session || session.state !== SessionState.Established) {
        throw new Error('Session not established');
      }

      // Send re-INVITE with sendrecv
      const sessionDescriptionHandler = session.sessionDescriptionHandler;
      if (sessionDescriptionHandler) {
        await session.invite({
          requestDelegate: {
            onAccept: () => {
              sipSessionData.holdState = false;
              this.emit('call:held', sessionId, false);
              logger.info({ sessionId }, 'Call resumed from hold');
            },
          },
        });
      }
    } catch (error) {
      logger.error({ error, sessionId }, 'Failed to unhold call');
      throw error;
    }
  }

  async sendDTMF(sessionId: string, tone: string, duration = 100): Promise<void> {
    try {
      const session = this.sipSessions.get(sessionId);
      if (!session || session.state !== SessionState.Established) {
        throw new Error('Session not established');
      }

      // Send DTMF via SIP INFO method
      const contentType = 'application/dtmf-relay';
      const body = `Signal=${tone}\r\nDuration=${duration}`;

      await session.info({
        requestOptions: {
          body: {
            contentType,
            body,
          },
        },
      });

      this.emit('dtmf:sent', sessionId, tone);

      logger.debug({ sessionId, tone, duration }, 'DTMF tone sent');
    } catch (error) {
      logger.error({ error, sessionId, tone }, 'Failed to send DTMF');
      throw error;
    }
  }

  async transfer(
    sessionId: string,
    target: string,
    transferType: 'blind' | 'attended' = 'blind'
  ): Promise<void> {
    try {
      const session = this.sipSessions.get(sessionId);
      if (!session || session.state !== SessionState.Established) {
        throw new Error('Session not established');
      }

      const targetURI = UserAgent.makeURI(`sip:${target}@${config.freeswitch.host}`);
      if (!targetURI) {
        throw new Error('Invalid transfer target');
      }

      if (transferType === 'blind') {
        await session.refer(targetURI, {
          requestDelegate: {
            onAccept: () => {
              logger.info({ sessionId, target }, 'Blind transfer initiated');
            },
            onReject: () => {
              logger.warn({ sessionId, target }, 'Transfer rejected');
            },
          },
        });
      } else {
        // Attended transfer would require establishing a second call first
        throw new Error('Attended transfer not yet implemented');
      }

      logger.info({ sessionId, target, transferType }, 'Call transfer initiated');
    } catch (error) {
      logger.error({ error, sessionId, target }, 'Failed to transfer call');
      throw error;
    }
  }

  getSession(sessionId: string): SIPSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionByCallId(callId: string): SIPSession | undefined {
    return Array.from(this.sessions.values()).find((s) => s.callId === callId);
  }

  getAgentSessions(agentId: string): SIPSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.agentId === agentId);
  }

  private handleSessionStateChange(sessionId: string, state: SessionState): void {
    const sipSession = this.sessions.get(sessionId);
    if (!sipSession) return;

    logger.debug({ sessionId, state }, 'SIP session state changed');

    switch (state) {
      case SessionState.Initial:
        sipSession.state = 'initial';
        break;
      case SessionState.Establishing:
        sipSession.state = 'establishing';
        break;
      case SessionState.Established:
        sipSession.state = 'established';
        this.emit('session:established', sessionId);
        break;
      case SessionState.Terminating:
        sipSession.state = 'terminating';
        break;
      case SessionState.Terminated:
        sipSession.state = 'terminated';
        sipSession.endTime = new Date();
        this.emit('session:terminated', sessionId);
        this.cleanup(sessionId);
        break;
    }
  }

  private updateSessionState(
    sessionId: string,
    state: 'initial' | 'establishing' | 'established' | 'terminating' | 'terminated'
  ): void {
    const sipSession = this.sessions.get(sessionId);
    if (sipSession) {
      sipSession.state = state;
      if (state === 'terminated') {
        sipSession.endTime = new Date();
      }
    }
  }

  private cleanup(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.sipSessions.delete(sessionId);
    logger.debug({ sessionId }, 'Session cleaned up');
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down SIP gateway...');

    // Hangup all active sessions
    for (const sessionId of this.sipSessions.keys()) {
      await this.hangup(sessionId);
    }

    // Unregister all agents
    for (const agentId of this.userAgents.keys()) {
      await this.unregisterAgent(agentId);
    }

    logger.info('SIP gateway shut down');
  }
}

export const sipGateway = new SIPGateway();
