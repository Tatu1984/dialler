import { EventEmitter } from 'events';

interface FreeSwitchConfig {
  host: string;
  port: number;
  password: string;
}

interface CallResult {
  uuid: string;
  success: boolean;
  hangupCause?: string;
  duration?: number;
  answerTime?: number;
}

export class FreeSwitchConnection extends EventEmitter {
  private config: FreeSwitchConfig;
  private connection: any = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connected = false;

  constructor(config: FreeSwitchConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Use ESL (Event Socket Library) to connect to FreeSWITCH
        const esl = require('esl');
        this.connection = new esl.Connection(
          this.config.host,
          this.config.port,
          this.config.password,
          () => {
            this.connected = true;
            this.emit('connected');
            this.subscribeToEvents();
            resolve();
          }
        );

        this.connection.on('error', (err: Error) => {
          this.emit('error', err);
          if (!this.connected) {
            reject(err);
          }
        });

        this.connection.on('esl::end', () => {
          this.connected = false;
          this.emit('disconnected');
          this.scheduleReconnect();
        });

        // Handle channel events
        this.connection.on('esl::event::CHANNEL_ANSWER::*', (event: any) => {
          this.emit('channel:answer', this.parseEvent(event));
        });

        this.connection.on('esl::event::CHANNEL_HANGUP::*', (event: any) => {
          this.emit('channel:hangup', this.parseEvent(event));
        });

        this.connection.on('esl::event::CHANNEL_BRIDGE::*', (event: any) => {
          this.emit('channel:bridge', this.parseEvent(event));
        });

        this.connection.on('esl::event::DTMF::*', (event: any) => {
          this.emit('dtmf', this.parseEvent(event));
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private subscribeToEvents(): void {
    if (!this.connection) return;

    this.connection.subscribe([
      'CHANNEL_CREATE',
      'CHANNEL_ANSWER',
      'CHANNEL_BRIDGE',
      'CHANNEL_HANGUP',
      'CHANNEL_HANGUP_COMPLETE',
      'DTMF',
      'BACKGROUND_JOB',
    ]);
  }

  private parseEvent(event: any): Record<string, any> {
    return {
      uuid: event.getHeader('Unique-ID'),
      callerIdNumber: event.getHeader('Caller-Caller-ID-Number'),
      callerIdName: event.getHeader('Caller-Caller-ID-Name'),
      destinationNumber: event.getHeader('Caller-Destination-Number'),
      channelState: event.getHeader('Channel-State'),
      hangupCause: event.getHeader('Hangup-Cause'),
      answerState: event.getHeader('Answer-State'),
      bridgeUuid: event.getHeader('Bridge-A-Unique-ID'),
      callDirection: event.getHeader('Call-Direction'),
      timestamp: event.getHeader('Event-Date-Timestamp'),
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error) {
        this.scheduleReconnect();
      }
    }, 5000);
  }

  async originate(params: {
    destination: string;
    callerId: string;
    callerIdName?: string;
    campaignId: string;
    leadId: string;
    agentId?: string;
    timeout?: number;
  }): Promise<CallResult> {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.connection) {
        reject(new Error('Not connected to FreeSWITCH'));
        return;
      }

      const uuid = this.generateUuid();
      const timeout = params.timeout || 60;

      // Build originate command
      const vars = [
        `origination_uuid=${uuid}`,
        `origination_caller_id_number=${params.callerId}`,
        `origination_caller_id_name=${params.callerIdName || params.callerId}`,
        `campaign_id=${params.campaignId}`,
        `lead_id=${params.leadId}`,
        `ignore_early_media=true`,
        `originate_timeout=${timeout}`,
      ];

      if (params.agentId) {
        vars.push(`agent_id=${params.agentId}`);
      }

      const dialString = `{${vars.join(',')}}sofia/gateway/default_gateway/${params.destination}`;
      const app = params.agentId
        ? `bridge(user/${params.agentId}@nexusdialer.local)`
        : 'park';

      this.connection.bgapi(`originate ${dialString} &${app}`, (res: any) => {
        const response = res.getBody();

        if (response.includes('+OK')) {
          // Set up handlers for this specific call
          const hangupHandler = (event: any) => {
            if (event.uuid === uuid) {
              this.removeListener('channel:hangup', hangupHandler);
              resolve({
                uuid,
                success: event.hangupCause === 'NORMAL_CLEARING',
                hangupCause: event.hangupCause,
              });
            }
          };
          this.on('channel:hangup', hangupHandler);

          // Timeout handler
          setTimeout(() => {
            this.removeListener('channel:hangup', hangupHandler);
          }, (timeout + 10) * 1000);

        } else {
          resolve({
            uuid,
            success: false,
            hangupCause: 'ORIGINATE_FAILED',
          });
        }
      });
    });
  }

  async transfer(uuid: string, destination: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.connected || !this.connection) {
        resolve(false);
        return;
      }

      this.connection.api(`uuid_transfer ${uuid} ${destination}`, (res: any) => {
        resolve(res.getBody().includes('+OK'));
      });
    });
  }

  async hangup(uuid: string, cause?: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.connected || !this.connection) {
        resolve(false);
        return;
      }

      const hangupCause = cause || 'NORMAL_CLEARING';
      this.connection.api(`uuid_kill ${uuid} ${hangupCause}`, (res: any) => {
        resolve(res.getBody().includes('+OK'));
      });
    });
  }

  async hold(uuid: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.connected || !this.connection) {
        resolve(false);
        return;
      }

      this.connection.api(`uuid_hold ${uuid}`, (res: any) => {
        resolve(res.getBody().includes('+OK'));
      });
    });
  }

  async unhold(uuid: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.connected || !this.connection) {
        resolve(false);
        return;
      }

      this.connection.api(`uuid_hold off ${uuid}`, (res: any) => {
        resolve(res.getBody().includes('+OK'));
      });
    });
  }

  async bridge(uuid1: string, uuid2: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.connected || !this.connection) {
        resolve(false);
        return;
      }

      this.connection.api(`uuid_bridge ${uuid1} ${uuid2}`, (res: any) => {
        resolve(res.getBody().includes('+OK'));
      });
    });
  }

  async playAudio(uuid: string, file: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.connected || !this.connection) {
        resolve(false);
        return;
      }

      this.connection.api(`uuid_broadcast ${uuid} ${file} both`, (res: any) => {
        resolve(res.getBody().includes('+OK'));
      });
    });
  }

  async startRecording(uuid: string, path: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.connected || !this.connection) {
        resolve(false);
        return;
      }

      this.connection.api(`uuid_record ${uuid} start ${path}`, (res: any) => {
        resolve(res.getBody().includes('+OK'));
      });
    });
  }

  async stopRecording(uuid: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.connected || !this.connection) {
        resolve(false);
        return;
      }

      this.connection.api(`uuid_record ${uuid} stop all`, (res: any) => {
        resolve(res.getBody().includes('+OK'));
      });
    });
  }

  private generateUuid(): string {
    const { v4: uuidv4 } = require('uuid');
    return uuidv4();
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.connection) {
      this.connection.disconnect();
      this.connection = null;
    }

    this.connected = false;
  }
}
