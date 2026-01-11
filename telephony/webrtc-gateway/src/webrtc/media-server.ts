import * as mediasoup from 'mediasoup';
import type { types as mediasoupTypes } from 'mediasoup';

type Worker = mediasoupTypes.Worker;
type Router = mediasoupTypes.Router;
type WebRtcTransport = mediasoupTypes.WebRtcTransport;
type Producer = mediasoupTypes.Producer;
type Consumer = mediasoupTypes.Consumer;
type RtpCapabilities = mediasoupTypes.RtpCapabilities;
type RtpParameters = mediasoupTypes.RtpParameters;
type DtlsParameters = mediasoupTypes.DtlsParameters;
type IceParameters = mediasoupTypes.IceParameters;
type IceCandidate = mediasoupTypes.IceCandidate;
type WorkerLogTag = mediasoupTypes.WorkerLogTag;
type DtlsState = mediasoupTypes.DtlsState;
import { createLogger } from '../utils/logger';
import { config } from '../config';
import type { RouterCapabilities } from '../types';

const logger = createLogger('media-server');

export class MediaServer {
  private workers: Worker[] = [];
  private routers: Map<string, Router> = new Map();
  private transports: Map<string, WebRtcTransport> = new Map();
  private producers: Map<string, Producer> = new Map();
  private consumers: Map<string, Consumer> = new Map();
  private nextWorkerIndex = 0;

  async initialize(): Promise<void> {
    logger.info('Initializing MediaSoup media server...');

    const numWorkers = config.mediasoup.numWorkers;

    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: config.mediasoup.worker.logLevel,
        logTags: config.mediasoup.worker.logTags as WorkerLogTag[],
        rtcMinPort: config.mediasoup.worker.rtcMinPort,
        rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
      });

      worker.on('died', () => {
        logger.error({ workerId: worker.pid }, 'MediaSoup worker died, restarting...');
        setTimeout(() => this.restartWorker(i), 2000);
      });

      this.workers.push(worker);

      logger.info(
        {
          workerId: worker.pid,
          workerIndex: i,
        },
        'MediaSoup worker created'
      );
    }

    logger.info({ numWorkers }, 'MediaSoup media server initialized successfully');
  }

  private async restartWorker(index: number): Promise<void> {
    try {
      const worker = await mediasoup.createWorker({
        logLevel: config.mediasoup.worker.logLevel,
        logTags: config.mediasoup.worker.logTags as WorkerLogTag[],
        rtcMinPort: config.mediasoup.worker.rtcMinPort,
        rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
      });

      worker.on('died', () => {
        logger.error({ workerId: worker.pid }, 'Restarted MediaSoup worker died');
        setTimeout(() => this.restartWorker(index), 2000);
      });

      this.workers[index] = worker;
      logger.info({ workerId: worker.pid, workerIndex: index }, 'Worker restarted');
    } catch (error) {
      logger.error({ error, workerIndex: index }, 'Failed to restart worker');
    }
  }

  private getNextWorker(): Worker {
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker;
  }

  async createRouter(tenantId: string): Promise<Router> {
    const existingRouter = this.routers.get(tenantId);
    if (existingRouter) {
      return existingRouter;
    }

    const worker = this.getNextWorker();
    const router = await worker.createRouter({
      mediaCodecs: config.mediasoup.router.mediaCodecs,
    });

    this.routers.set(tenantId, router);

    logger.info(
      {
        tenantId,
        routerId: router.id,
        workerId: worker.pid,
      },
      'Router created'
    );

    return router;
  }

  getRouter(tenantId: string): Router | undefined {
    return this.routers.get(tenantId);
  }

  async getRouterCapabilities(tenantId: string): Promise<RouterCapabilities> {
    const router = await this.createRouter(tenantId);
    return {
      codecs: router.rtpCapabilities.codecs,
      headerExtensions: router.rtpCapabilities.headerExtensions,
    };
  }

  async createWebRtcTransport(
    tenantId: string,
    agentId: string
  ): Promise<{
    transport: WebRtcTransport;
    params: {
      id: string;
      iceParameters: IceParameters;
      iceCandidates: IceCandidate[];
      dtlsParameters: DtlsParameters;
    };
  }> {
    const router = await this.createRouter(tenantId);

    const transport = await router.createWebRtcTransport({
      listenIps: config.mediasoup.webRtcTransport.listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate:
        config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
      minimumAvailableOutgoingBitrate:
        config.mediasoup.webRtcTransport.minimumAvailableOutgoingBitrate,
      maxIncomingBitrate: config.mediasoup.webRtcTransport.maxIncomingBitrate,
      maxSctpMessageSize: config.mediasoup.webRtcTransport.maxSctpMessageSize,
    });

    this.transports.set(transport.id, transport);

    transport.on('dtlsstatechange', (dtlsState: DtlsState) => {
      logger.debug(
        {
          transportId: transport.id,
          dtlsState,
          tenantId,
          agentId,
        },
        'Transport DTLS state changed'
      );

      if (dtlsState === 'closed' || dtlsState === 'failed') {
        transport.close();
      }
    });

    transport.on('close', () => {
      logger.info(
        {
          transportId: transport.id,
          tenantId,
          agentId,
        },
        'Transport closed'
      );
      this.transports.delete(transport.id);
    });

    logger.info(
      {
        transportId: transport.id,
        tenantId,
        agentId,
      },
      'WebRTC transport created'
    );

    return {
      transport,
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      },
    };
  }

  async connectWebRtcTransport(
    transportId: string,
    dtlsParameters: DtlsParameters
  ): Promise<void> {
    const transport = this.transports.get(transportId);

    if (!transport) {
      throw new Error(`Transport not found: ${transportId}`);
    }

    await transport.connect({ dtlsParameters });

    logger.info({ transportId }, 'Transport connected');
  }

  async createProducer(
    transportId: string,
    kind: 'audio' | 'video',
    rtpParameters: RtpParameters
  ): Promise<Producer> {
    const transport = this.transports.get(transportId);

    if (!transport) {
      throw new Error(`Transport not found: ${transportId}`);
    }

    const producer = await transport.produce({
      kind,
      rtpParameters,
    });

    this.producers.set(producer.id, producer);

    producer.on('transportclose', () => {
      logger.info({ producerId: producer.id }, 'Producer transport closed');
      this.producers.delete(producer.id);
    });

    logger.info(
      {
        producerId: producer.id,
        transportId,
        kind,
      },
      'Producer created'
    );

    return producer;
  }

  async createConsumer(
    transportId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities
  ): Promise<Consumer> {
    const transport = this.transports.get(transportId);

    if (!transport) {
      throw new Error(`Transport not found: ${transportId}`);
    }

    const producer = this.producers.get(producerId);

    if (!producer) {
      throw new Error(`Producer not found: ${producerId}`);
    }

    const router = transport.router;

    if (!router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Cannot consume producer with given capabilities');
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true, // Start paused, will be resumed after client is ready
    });

    this.consumers.set(consumer.id, consumer);

    consumer.on('transportclose', () => {
      logger.info({ consumerId: consumer.id }, 'Consumer transport closed');
      this.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      logger.info({ consumerId: consumer.id }, 'Consumer producer closed');
      this.consumers.delete(consumer.id);
    });

    logger.info(
      {
        consumerId: consumer.id,
        producerId,
        transportId,
        kind: consumer.kind,
      },
      'Consumer created'
    );

    return consumer;
  }

  async resumeConsumer(consumerId: string): Promise<void> {
    const consumer = this.consumers.get(consumerId);

    if (!consumer) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }

    await consumer.resume();

    logger.debug({ consumerId }, 'Consumer resumed');
  }

  async pauseConsumer(consumerId: string): Promise<void> {
    const consumer = this.consumers.get(consumerId);

    if (!consumer) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }

    await consumer.pause();

    logger.debug({ consumerId }, 'Consumer paused');
  }

  getProducer(producerId: string): Producer | undefined {
    return this.producers.get(producerId);
  }

  getConsumer(consumerId: string): Consumer | undefined {
    return this.consumers.get(consumerId);
  }

  getTransport(transportId: string): WebRtcTransport | undefined {
    return this.transports.get(transportId);
  }

  closeTransport(transportId: string): void {
    const transport = this.transports.get(transportId);
    if (transport) {
      transport.close();
      this.transports.delete(transportId);
      logger.info({ transportId }, 'Transport closed');
    }
  }

  closeProducer(producerId: string): void {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.close();
      this.producers.delete(producerId);
      logger.info({ producerId }, 'Producer closed');
    }
  }

  closeConsumer(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.close();
      this.consumers.delete(consumerId);
      logger.info({ consumerId }, 'Consumer closed');
    }
  }

  async getStats(): Promise<{
    workers: number;
    routers: number;
    transports: number;
    producers: number;
    consumers: number;
  }> {
    return {
      workers: this.workers.length,
      routers: this.routers.size,
      transports: this.transports.size,
      producers: this.producers.size,
      consumers: this.consumers.size,
    };
  }

  async close(): Promise<void> {
    logger.info('Closing media server...');

    // Close all consumers
    for (const consumer of this.consumers.values()) {
      consumer.close();
    }
    this.consumers.clear();

    // Close all producers
    for (const producer of this.producers.values()) {
      producer.close();
    }
    this.producers.clear();

    // Close all transports
    for (const transport of this.transports.values()) {
      transport.close();
    }
    this.transports.clear();

    // Close all routers
    for (const router of this.routers.values()) {
      router.close();
    }
    this.routers.clear();

    // Close all workers
    for (const worker of this.workers) {
      worker.close();
    }
    this.workers = [];

    logger.info('Media server closed');
  }
}

export const mediaServer = new MediaServer();
