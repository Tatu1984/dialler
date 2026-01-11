import { EventEmitter } from 'events';
import * as esl from 'esl';
import pino from 'pino';

const logger = pino({ name: 'freeswitch-client' });

export interface FreeSWITCHConfig {
  host: string;
  port: number;
  password: string;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export interface CallEvent {
  uuid: string;
  callId: string;
  direction: 'inbound' | 'outbound';
  state: string;
  callerIdNumber?: string;
  callerIdName?: string;
  destinationNumber?: string;
  channelName?: string;
  answerState?: string;
  hangupCause?: string;
  timestamp: Date;
  [key: string]: any;
}

export class FreeSWITCHClient extends EventEmitter {
  private connection: any;
  private config: FreeSWITCHConfig;
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private isConnected = false;
  private subscriptions: Set<string> = new Set();

  constructor(config: FreeSWITCHConfig) {
    super();
    this.config = {
      reconnectDelay: 5000,
      maxReconnectAttempts: -1, // infinite
      ...config,
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(
        { host: this.config.host, port: this.config.port },
        'Connecting to FreeSWITCH ESL'
      );

      this.connection = new esl.Connection(
        this.config.host,
        this.config.port,
        this.config.password,
        () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          logger.info('Connected to FreeSWITCH ESL');

          // Subscribe to events
          this.subscribeToEvents();

          this.emit('connected');
          resolve();
        }
      );

      this.connection.on('error', (error: Error) => {
        logger.error({ error }, 'FreeSWITCH connection error');
        this.emit('error', error);

        if (!this.isConnected) {
          reject(error);
        }
      });

      this.connection.on('esl::end', () => {
        this.isConnected = false;
        logger.warn('FreeSWITCH connection closed');
        this.emit('disconnected');
        this.handleReconnect();
      });

      this.connection.on('esl::event::**', (event: any) => {
        this.handleEvent(event);
      });
    });
  }

  private subscribeToEvents(): void {
    const events = [
      'CHANNEL_CREATE',
      'CHANNEL_ANSWER',
      'CHANNEL_BRIDGE',
      'CHANNEL_UNBRIDGE',
      'CHANNEL_HANGUP',
      'CHANNEL_HANGUP_COMPLETE',
      'CHANNEL_PROGRESS',
      'CHANNEL_PROGRESS_MEDIA',
      'DTMF',
      'CUSTOM',
    ];

    events.forEach((event) => {
      this.connection.subscribe(event);
      this.subscriptions.add(event);
      logger.debug({ event }, 'Subscribed to event');
    });

    logger.info({ events }, 'Subscribed to FreeSWITCH events');
  }

  private handleEvent(event: any): void {
    try {
      const eventName = event.getHeader('Event-Name');
      const eventData = this.parseEvent(event);

      logger.debug({ eventName, uuid: eventData.uuid }, 'Received event');

      // Emit specific event
      this.emit(`event:${eventName}`, eventData);

      // Emit generic event
      this.emit('event', eventName, eventData);

      // Handle channel state changes
      if (eventName.startsWith('CHANNEL_')) {
        this.emit('channel:state', eventData);
      }
    } catch (error) {
      logger.error({ error }, 'Error handling event');
    }
  }

  private parseEvent(event: any): CallEvent {
    const headers = event.headers || {};

    return {
      uuid: headers['Unique-ID'] || headers['Channel-Call-UUID'],
      callId: headers['variable_sip_call_id'] || headers['Channel-Call-UUID'],
      direction: headers['Call-Direction'] === 'outbound' ? 'outbound' : 'inbound',
      state: headers['Channel-State'] || headers['Answer-State'],
      callerIdNumber: headers['Caller-Caller-ID-Number'],
      callerIdName: headers['Caller-Caller-ID-Name'],
      destinationNumber: headers['Caller-Destination-Number'],
      channelName: headers['Channel-Name'],
      answerState: headers['Answer-State'],
      hangupCause: headers['Hangup-Cause'],
      timestamp: new Date(),
      raw: headers,
    };
  }

  private handleReconnect(): void {
    const { maxReconnectAttempts, reconnectDelay } = this.config;

    if (maxReconnectAttempts !== -1 && this.reconnectAttempts >= maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached, giving up');
      this.emit('reconnect:failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = reconnectDelay! * Math.min(this.reconnectAttempts, 10);

    logger.info(
      { attempt: this.reconnectAttempts, delay },
      'Scheduling reconnect'
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        logger.error({ error }, 'Reconnect failed');
      });
    }, delay);
  }

  async execute(uuid: string, command: string, args?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        return reject(new Error('Not connected to FreeSWITCH'));
      }

      const cmd = args ? `${command} ${args}` : command;

      logger.debug({ uuid, command: cmd }, 'Executing command');

      this.connection.execute(
        'uuid_' + command,
        uuid + (args ? ' ' + args : ''),
        (response: any) => {
          if (response.getHeader('Reply-Text')?.includes('-ERR')) {
            const error = new Error(response.getHeader('Reply-Text'));
            logger.error({ error, uuid, command: cmd }, 'Command failed');
            return reject(error);
          }

          logger.debug({ uuid, command: cmd }, 'Command executed successfully');
          resolve(response);
        }
      );
    });
  }

  async api(command: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        return reject(new Error('Not connected to FreeSWITCH'));
      }

      logger.debug({ command }, 'Executing API command');

      this.connection.api(command, (response: any) => {
        const body = response.getBody();

        if (body?.includes('-ERR')) {
          const error = new Error(body);
          logger.error({ error, command }, 'API command failed');
          return reject(error);
        }

        logger.debug({ command, response: body }, 'API command executed');
        resolve(response);
      });
    });
  }

  async bgapi(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        return reject(new Error('Not connected to FreeSWITCH'));
      }

      logger.debug({ command }, 'Executing background API command');

      this.connection.bgapi(command, (response: any) => {
        const jobId = response.getHeader('Job-UUID');

        if (!jobId) {
          const error = new Error('No Job-UUID received');
          logger.error({ error, command }, 'BGAPI command failed');
          return reject(error);
        }

        logger.debug({ command, jobId }, 'BGAPI command submitted');
        resolve(jobId);
      });
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.connection) {
      this.connection.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from FreeSWITCH');
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async getChannelInfo(uuid: string): Promise<any> {
    const response = await this.api(`uuid_dump ${uuid}`);
    const body = response.getBody();

    // Parse channel variables
    const vars: Record<string, string> = {};
    body.split('\n').forEach((line: string) => {
      const [key, value] = line.split(': ');
      if (key && value) {
        vars[key.trim()] = value.trim();
      }
    });

    return vars;
  }

  async getActiveChannels(): Promise<any[]> {
    const response = await this.api('show channels as json');
    const body = response.getBody();

    try {
      const data = JSON.parse(body);
      return data.rows || [];
    } catch (error) {
      logger.error({ error }, 'Failed to parse channels JSON');
      return [];
    }
  }

  async getChannelCount(): Promise<number> {
    const response = await this.api('show channels count');
    const body = response.getBody();
    const match = body.match(/(\d+) total/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
