import { QdrantClient } from '@qdrant/js-client-rest';

let client: QdrantClient | null = null;

const COLLECTION_NAME = 'knowledge_articles';

export async function initVectorStore(): Promise<QdrantClient> {
  if (client) {
    return client;
  }

  client = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
  });

  // Create collection if it doesn't exist
  try {
    await client.getCollection(COLLECTION_NAME);
  } catch (error) {
    console.log('Creating knowledge articles collection...');
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 1536, // OpenAI embedding size
        distance: 'Cosine',
      },
    });
  }

  return client;
}

export function getVectorStore(): QdrantClient {
  if (!client) {
    throw new Error('Vector store not initialized');
  }
  return client;
}

export { COLLECTION_NAME };
