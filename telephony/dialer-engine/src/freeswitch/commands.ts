import { FreeSWITCHClient } from './client';
import pino from 'pino';

const logger = pino({ name: 'freeswitch-commands' });

export interface OriginateOptions {
  phoneNumber: string;
  callerId?: string;
  callerIdName?: string;
  destinationExtension?: string;
  destinationApp?: string;
  destinationAppArgs?: string;
  timeout?: number;
  variables?: Record<string, string | number>;
  ignoreEarlyMedia?: boolean;
  ringReady?: boolean;
}

export interface BridgeOptions {
  uuid1: string;
  uuid2: string;
}

export interface TransferOptions {
  uuid: string;
  destination: string;
  dialplan?: string;
  context?: string;
}

export class FreeSWITCHCommands {
  constructor(private client: FreeSWITCHClient) {}

  /**
   * Originate a new outbound call
   */
  async originate(options: OriginateOptions): Promise<string> {
    const {
      phoneNumber,
      callerId,
      callerIdName,
      destinationExtension,
      destinationApp = 'park',
      destinationAppArgs = '',
      timeout = 30,
      variables = {},
      ignoreEarlyMedia = false,
      ringReady = false,
    } = options;

    // Build channel variables
    const vars: Record<string, string | number> = {
      ignore_early_media: ignoreEarlyMedia ? 'true' : 'false',
      ring_ready: ringReady ? 'true' : 'false',
      origination_caller_id_number: callerId || '',
      origination_caller_id_name: callerIdName || '',
      ...variables,
    };

    const varString = Object.entries(vars)
      .filter(([_, value]) => value !== '')
      .map(([key, value]) => `${key}='${value}'`)
      .join(',');

    // Build destination
    let destination: string;
    if (destinationExtension) {
      destination = destinationExtension;
    } else {
      destination = `&${destinationApp}(${destinationAppArgs})`;
    }

    // Build originate command
    const originateCmd = `originate {${varString}}sofia/external/${phoneNumber} ${destination}`;

    logger.info(
      { phoneNumber, callerId, destination: destinationApp },
      'Originating call'
    );

    try {
      const response = await this.client.bgapi(originateCmd);
      logger.info({ jobId: response, phoneNumber }, 'Call originated');
      return response; // Returns Job-UUID
    } catch (error) {
      logger.error({ error, phoneNumber }, 'Failed to originate call');
      throw error;
    }
  }

  /**
   * Bridge two calls together
   */
  async bridge(options: BridgeOptions): Promise<void> {
    const { uuid1, uuid2 } = options;

    logger.info({ uuid1, uuid2 }, 'Bridging calls');

    try {
      await this.client.execute(uuid1, 'bridge', uuid2);
      logger.info({ uuid1, uuid2 }, 'Calls bridged successfully');
    } catch (error) {
      logger.error({ error, uuid1, uuid2 }, 'Failed to bridge calls');
      throw error;
    }
  }

  /**
   * Hangup a call
   */
  async hangup(uuid: string, cause: string = 'NORMAL_CLEARING'): Promise<void> {
    logger.info({ uuid, cause }, 'Hanging up call');

    try {
      await this.client.api(`uuid_kill ${uuid} ${cause}`);
      logger.info({ uuid }, 'Call hung up successfully');
    } catch (error) {
      logger.error({ error, uuid }, 'Failed to hangup call');
      throw error;
    }
  }

  /**
   * Transfer a call
   */
  async transfer(options: TransferOptions): Promise<void> {
    const { uuid, destination, dialplan = 'XML', context = 'default' } = options;

    logger.info({ uuid, destination, dialplan, context }, 'Transferring call');

    try {
      await this.client.execute(uuid, 'transfer', `${destination} ${dialplan} ${context}`);
      logger.info({ uuid, destination }, 'Call transferred successfully');
    } catch (error) {
      logger.error({ error, uuid, destination }, 'Failed to transfer call');
      throw error;
    }
  }

  /**
   * Put a call on hold
   */
  async hold(uuid: string, musicClass: string = 'local_stream://moh'): Promise<void> {
    logger.info({ uuid, musicClass }, 'Putting call on hold');

    try {
      await this.client.execute(uuid, 'hold', musicClass);
      logger.info({ uuid }, 'Call put on hold');
    } catch (error) {
      logger.error({ error, uuid }, 'Failed to put call on hold');
      throw error;
    }
  }

  /**
   * Resume a call from hold
   */
  async unhold(uuid: string): Promise<void> {
    logger.info({ uuid }, 'Resuming call from hold');

    try {
      await this.client.execute(uuid, 'unhold');
      logger.info({ uuid }, 'Call resumed from hold');
    } catch (error) {
      logger.error({ error, uuid }, 'Failed to resume call');
      throw error;
    }
  }

  /**
   * Play audio to a channel
   */
  async playback(uuid: string, audioFile: string): Promise<void> {
    logger.info({ uuid, audioFile }, 'Playing audio');

    try {
      await this.client.execute(uuid, 'playback', audioFile);
      logger.info({ uuid, audioFile }, 'Audio playback started');
    } catch (error) {
      logger.error({ error, uuid, audioFile }, 'Failed to play audio');
      throw error;
    }
  }

  /**
   * Start recording a call
   */
  async startRecording(uuid: string, filePath: string): Promise<void> {
    logger.info({ uuid, filePath }, 'Starting call recording');

    try {
      await this.client.execute(uuid, 'record_session', filePath);
      logger.info({ uuid, filePath }, 'Call recording started');
    } catch (error) {
      logger.error({ error, uuid }, 'Failed to start recording');
      throw error;
    }
  }

  /**
   * Stop recording a call
   */
  async stopRecording(uuid: string, filePath: string): Promise<void> {
    logger.info({ uuid, filePath }, 'Stopping call recording');

    try {
      await this.client.api(`uuid_record ${uuid} stop ${filePath}`);
      logger.info({ uuid }, 'Call recording stopped');
    } catch (error) {
      logger.error({ error, uuid }, 'Failed to stop recording');
      throw error;
    }
  }

  /**
   * Set a channel variable
   */
  async setVariable(uuid: string, name: string, value: string): Promise<void> {
    logger.debug({ uuid, name, value }, 'Setting channel variable');

    try {
      await this.client.api(`uuid_setvar ${uuid} ${name} ${value}`);
    } catch (error) {
      logger.error({ error, uuid, name }, 'Failed to set variable');
      throw error;
    }
  }

  /**
   * Get a channel variable
   */
  async getVariable(uuid: string, name: string): Promise<string> {
    logger.debug({ uuid, name }, 'Getting channel variable');

    try {
      const response = await this.client.api(`uuid_getvar ${uuid} ${name}`);
      return response.getBody().trim();
    } catch (error) {
      logger.error({ error, uuid, name }, 'Failed to get variable');
      throw error;
    }
  }

  /**
   * Park a call
   */
  async park(uuid: string): Promise<void> {
    logger.info({ uuid }, 'Parking call');

    try {
      await this.client.execute(uuid, 'park');
      logger.info({ uuid }, 'Call parked');
    } catch (error) {
      logger.error({ error, uuid }, 'Failed to park call');
      throw error;
    }
  }

  /**
   * Answer a call
   */
  async answer(uuid: string): Promise<void> {
    logger.info({ uuid }, 'Answering call');

    try {
      await this.client.execute(uuid, 'answer');
      logger.info({ uuid }, 'Call answered');
    } catch (error) {
      logger.error({ error, uuid }, 'Failed to answer call');
      throw error;
    }
  }

  /**
   * Pre-answer a call (early media)
   */
  async preAnswer(uuid: string): Promise<void> {
    logger.info({ uuid }, 'Pre-answering call');

    try {
      await this.client.execute(uuid, 'pre_answer');
      logger.info({ uuid }, 'Call pre-answered');
    } catch (error) {
      logger.error({ error, uuid }, 'Failed to pre-answer call');
      throw error;
    }
  }

  /**
   * Send DTMF tones
   */
  async sendDTMF(uuid: string, digits: string, duration: number = 2000): Promise<void> {
    logger.info({ uuid, digits }, 'Sending DTMF');

    try {
      await this.client.execute(uuid, 'send_dtmf', `${digits}@${duration}`);
      logger.info({ uuid, digits }, 'DTMF sent');
    } catch (error) {
      logger.error({ error, uuid, digits }, 'Failed to send DTMF');
      throw error;
    }
  }

  /**
   * Eavesdrop on a call (for monitoring/coaching)
   */
  async eavesdrop(targetUuid: string, mode: 'listen' | 'whisper' | 'barge' = 'listen'): Promise<void> {
    logger.info({ targetUuid, mode }, 'Starting eavesdrop');

    try {
      await this.client.execute(targetUuid, 'eavesdrop', mode);
      logger.info({ targetUuid, mode }, 'Eavesdrop started');
    } catch (error) {
      logger.error({ error, targetUuid, mode }, 'Failed to start eavesdrop');
      throw error;
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(uuid: string): Promise<string> {
    logger.debug({ uuid }, 'Getting call status');

    try {
      const response = await this.client.api(`uuid_exists ${uuid}`);
      const body = response.getBody().trim();
      return body === 'true' ? 'active' : 'inactive';
    } catch (error) {
      logger.error({ error, uuid }, 'Failed to get call status');
      throw error;
    }
  }

  /**
   * Broadcast audio to a call (interrupt current audio)
   */
  async broadcast(uuid: string, audioFile: string, legs: 'aleg' | 'bleg' | 'both' = 'both'): Promise<void> {
    logger.info({ uuid, audioFile, legs }, 'Broadcasting audio');

    try {
      await this.client.api(`uuid_broadcast ${uuid} ${audioFile} ${legs}`);
      logger.info({ uuid, audioFile }, 'Audio broadcast started');
    } catch (error) {
      logger.error({ error, uuid, audioFile }, 'Failed to broadcast audio');
      throw error;
    }
  }

  /**
   * Deflect a call (302 redirect)
   */
  async deflect(uuid: string, sipUri: string): Promise<void> {
    logger.info({ uuid, sipUri }, 'Deflecting call');

    try {
      await this.client.execute(uuid, 'deflect', sipUri);
      logger.info({ uuid, sipUri }, 'Call deflected');
    } catch (error) {
      logger.error({ error, uuid, sipUri }, 'Failed to deflect call');
      throw error;
    }
  }
}
