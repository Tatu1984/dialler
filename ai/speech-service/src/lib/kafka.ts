import { Kafka, Producer } from 'kafkajs';

let producer: Producer | null = null;

export async function initKafkaProducer(): Promise<Producer> {
  if (producer) {
    return producer;
  }

  const kafka = new Kafka({
    clientId: 'speech-service',
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
