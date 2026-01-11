import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb, knowledgeArticles, type KnowledgeArticle, type NewKnowledgeArticle } from '@nexusdialer/database';
import { getVectorStore, COLLECTION_NAME } from '../lib/vector-store.js';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'crypto';

export interface SearchResult extends KnowledgeArticle {
  relevance?: number;
  distance?: number;
}

export class KnowledgeBaseService {
  private db = getDb();
  private vectorStore = getVectorStore();
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Create a new knowledge article with vector embedding
   */
  async createArticle(data: Omit<NewKnowledgeArticle, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeArticle> {
    const articleId = uuidv4();

    // Generate embedding for the article
    const embedding = await this.generateEmbedding(data.content);
    const embeddingId = `emb_${articleId}`;

    // Store in vector database
    await this.vectorStore.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: embeddingId,
          vector: embedding,
          payload: {
            articleId,
            tenantId: data.tenantId,
            title: data.title,
            category: data.category,
            tags: data.tags,
          },
        },
      ],
    });

    // Store in PostgreSQL
    const [article] = await this.db
      .insert(knowledgeArticles)
      .values({
        ...data,
        id: articleId,
        embeddingId,
      })
      .returning();

    return article;
  }

  /**
   * Update a knowledge article and its embedding
   */
  async updateArticle(
    id: string,
    tenantId: string,
    updates: Partial<Omit<NewKnowledgeArticle, 'id' | 'tenantId' | 'createdAt'>>
  ): Promise<KnowledgeArticle | null> {
    const article = await this.getById(id, tenantId);
    if (!article) {
      return null;
    }

    // If content changed, update embedding
    if (updates.content && updates.content !== article.content) {
      const embedding = await this.generateEmbedding(updates.content);
      const embeddingId = article.embeddingId || `emb_${id}`;

      await this.vectorStore.upsert(COLLECTION_NAME, {
        wait: true,
        points: [
          {
            id: embeddingId,
            vector: embedding,
            payload: {
              articleId: id,
              tenantId: article.tenantId,
              title: updates.title || article.title,
              category: updates.category || article.category,
              tags: updates.tags || article.tags,
            },
          },
        ],
      });

      updates.embeddingId = embeddingId;
    }

    const [updated] = await this.db
      .update(knowledgeArticles)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(knowledgeArticles.id, id), eq(knowledgeArticles.tenantId, tenantId)))
      .returning();

    return updated || null;
  }

  /**
   * Search knowledge base using semantic search
   */
  async search(
    tenantId: string,
    query: string,
    options: {
      limit?: number;
      category?: string;
      tags?: string[];
      minScore?: number;
    } = {}
  ): Promise<SearchResult[]> {
    const { limit = 5, category, tags, minScore = 0.7 } = options;

    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query);

    // Build filter
    const filter: any = {
      must: [{ key: 'tenantId', match: { value: tenantId } }],
    };

    if (category) {
      filter.must.push({ key: 'category', match: { value: category } });
    }

    if (tags && tags.length > 0) {
      filter.must.push({
        key: 'tags',
        match: { any: tags },
      });
    }

    // Search in vector store
    const searchResults = await this.vectorStore.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      filter,
      limit,
      with_payload: true,
      score_threshold: minScore,
    });

    // Fetch full articles from database
    const articleIds = searchResults.map((r) => r.payload?.articleId as string);
    if (articleIds.length === 0) {
      return [];
    }

    const articles = await this.db
      .select()
      .from(knowledgeArticles)
      .where(
        and(
          eq(knowledgeArticles.tenantId, tenantId),
          sql`${knowledgeArticles.id} = ANY(${articleIds})`
        )
      );

    // Merge with relevance scores
    const resultsMap = new Map(searchResults.map((r) => [r.payload?.articleId, r.score]));
    return articles.map((article) => ({
      ...article,
      relevance: resultsMap.get(article.id) || 0,
    }));
  }

  /**
   * Get article by ID
   */
  async getById(id: string, tenantId: string): Promise<KnowledgeArticle | null> {
    const [article] = await this.db
      .select()
      .from(knowledgeArticles)
      .where(and(eq(knowledgeArticles.id, id), eq(knowledgeArticles.tenantId, tenantId)))
      .limit(1);

    if (article) {
      // Increment view count
      await this.db
        .update(knowledgeArticles)
        .set({ viewCount: sql`${knowledgeArticles.viewCount} + 1` })
        .where(eq(knowledgeArticles.id, id));
    }

    return article || null;
  }

  /**
   * Get all articles for a tenant
   */
  async getByTenant(
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      category?: string;
      status?: string;
    } = {}
  ): Promise<KnowledgeArticle[]> {
    const { limit = 50, offset = 0, category, status = 'published' } = options;

    let query = this.db
      .select()
      .from(knowledgeArticles)
      .where(
        and(
          eq(knowledgeArticles.tenantId, tenantId),
          eq(knowledgeArticles.status, status)
        )
      );

    if (category) {
      query = query.where(
        and(
          eq(knowledgeArticles.tenantId, tenantId),
          eq(knowledgeArticles.status, status),
          eq(knowledgeArticles.category, category)
        )
      );
    }

    return await query
      .orderBy(desc(knowledgeArticles.updatedAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get articles by category
   */
  async getByCategory(
    tenantId: string,
    category: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<KnowledgeArticle[]> {
    const { limit = 50, offset = 0 } = options;

    return await this.db
      .select()
      .from(knowledgeArticles)
      .where(
        and(
          eq(knowledgeArticles.tenantId, tenantId),
          eq(knowledgeArticles.category, category),
          eq(knowledgeArticles.status, 'published')
        )
      )
      .orderBy(desc(knowledgeArticles.viewCount))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get articles by tags
   */
  async getByTags(
    tenantId: string,
    tags: string[],
    options: { limit?: number; offset?: number } = {}
  ): Promise<KnowledgeArticle[]> {
    const { limit = 50, offset = 0 } = options;

    return await this.db.execute(
      `
      SELECT * FROM knowledge_articles
      WHERE tenant_id = $1
        AND status = 'published'
        AND tags @> $2
      ORDER BY view_count DESC
      LIMIT $3 OFFSET $4
    `,
      [tenantId, JSON.stringify(tags), limit, offset]
    ) as any;
  }

  /**
   * Mark article as helpful
   */
  async markAsHelpful(id: string, tenantId: string): Promise<void> {
    await this.db
      .update(knowledgeArticles)
      .set({ helpfulCount: sql`${knowledgeArticles.helpfulCount} + 1` })
      .where(and(eq(knowledgeArticles.id, id), eq(knowledgeArticles.tenantId, tenantId)));
  }

  /**
   * Delete article (soft delete by changing status)
   */
  async deleteArticle(id: string, tenantId: string): Promise<boolean> {
    const article = await this.getById(id, tenantId);
    if (!article) {
      return false;
    }

    // Soft delete in database
    await this.db
      .update(knowledgeArticles)
      .set({ status: 'archived' })
      .where(and(eq(knowledgeArticles.id, id), eq(knowledgeArticles.tenantId, tenantId)));

    // Delete from vector store
    if (article.embeddingId) {
      await this.vectorStore.delete(COLLECTION_NAME, {
        wait: true,
        points: [article.embeddingId],
      });
    }

    return true;
  }

  /**
   * Get popular articles
   */
  async getPopular(
    tenantId: string,
    options: { limit?: number; category?: string } = {}
  ): Promise<KnowledgeArticle[]> {
    const { limit = 10, category } = options;

    let query = this.db
      .select()
      .from(knowledgeArticles)
      .where(
        and(
          eq(knowledgeArticles.tenantId, tenantId),
          eq(knowledgeArticles.status, 'published')
        )
      );

    if (category) {
      query = query.where(
        and(
          eq(knowledgeArticles.tenantId, tenantId),
          eq(knowledgeArticles.status, 'published'),
          eq(knowledgeArticles.category, category)
        )
      );
    }

    return await query.orderBy(desc(knowledgeArticles.viewCount)).limit(limit);
  }

  /**
   * Generate embedding for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  }

  /**
   * Bulk import articles
   */
  async bulkImport(
    tenantId: string,
    articles: Array<Omit<NewKnowledgeArticle, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>
  ): Promise<KnowledgeArticle[]> {
    const created: KnowledgeArticle[] = [];

    for (const article of articles) {
      try {
        const result = await this.createArticle({
          ...article,
          tenantId,
        });
        created.push(result);
      } catch (error) {
        console.error(`Failed to import article: ${article.title}`, error);
      }
    }

    return created;
  }
}
