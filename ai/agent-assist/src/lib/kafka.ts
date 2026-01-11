import { Kafka, Producer, Consumer } from 'kafkajs';

let producer: Producer | null = null;
let consumer: Consumer | null = null;

export async function initKafkaProducer(): Promise<Producer> {
  if (producer) {
    return producer;
  }

  const kafka = new Kafka({
    clientId: 'agent-assist',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    retry: {
      initialRetryTime: 100,
      retries: 8,
    },
  });

  producer = kafka.producer({
    allowAutoTopicCreation: true,
    transactionTimeout: 30000,
  });

  await producer.connect();

  return producer;
}

export async function initKafkaConsumer(): Promise<Consumer> {
  if (consumer) {
    return consumer;
  }

  const kafka = new Kafka({
    clientId: 'agent-assist',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    retry: {
      initialRetryTime: 100,
      retries: 8,
    },
  });

  consumer = kafka.consumer({
    groupId: 'agent-assist-service',
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
  });

  await consumer.connect();

  return consumer;
}

export async function publishEvent(topic: string, event: any): Promise<void> {
  if (!producer) {
    throw new Error('Kafka producer not initialized');
  }

  await producer.send({
    topic,
    messages: [
      {
        key: event.eventId || event.payload?.callId,
        value: JSON.stringify(event),
        timestamp: Date.now().toString(),
      },
    ],
  });
}

export function getProducer(): Producer {
  if (!producer) {
    throw new Error('Kafka producer not initialized');
  }
  return producer;
}

export function getConsumer(): Consumer {
  if (!consumer) {
    throw new Error('Kafka consumer not initialized');
  }
  return consumer;
}
