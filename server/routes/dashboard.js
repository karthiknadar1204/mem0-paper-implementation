import { db } from '../config/db.js';
import { memories, apiRequests, retrievalLogs } from '../config/schema.js';
import { conversations } from '../config/schema.js';
import { eq, desc, and, sql, like, or } from 'drizzle-orm';
import { index } from '../utils/pinecone.js';
import { embedText, resolveEmbeddingsApiKey, LLMError } from '../utils/llm-client.js';
import { memoryProcessQueue } from '../config/queue.js';

// Get all memories for a conversation
export const getMemoriesRoute = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const userMemories = await db
      .select()
      .from(memories)
      .where(eq(memories.conversationId, conversationId))
      .orderBy(desc(memories.createdAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    return res.status(200).json(userMemories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get memories from same date in previous years
export const getOnThisDayRoute = async (req, res) => {
  try {
    const { id: conversationId } = req.params;

    const onThisDayMemories = await db
      .select()
      .from(memories)
      .where(
        and(
          eq(memories.conversationId, conversationId),
          sql`EXTRACT(DAY FROM ${memories.createdAt}) = EXTRACT(DAY FROM CURRENT_DATE)`,
          sql`EXTRACT(MONTH FROM ${memories.createdAt}) = EXTRACT(MONTH FROM CURRENT_DATE)`,
          sql`EXTRACT(YEAR FROM ${memories.createdAt}) < EXTRACT(YEAR FROM CURRENT_DATE)`
        )
      )
      .orderBy(desc(memories.createdAt));

    return res.status(200).json(onThisDayMemories);
  } catch (error) {
    console.error('Error fetching on this day memories:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Search memories
export const searchMemoriesRoute = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ error: 'search query is required' });
    }

    const searchTerm = `%${q.trim()}%`;

    const searchResults = await db
      .select()
      .from(memories)
      .where(
        and(
          eq(memories.conversationId, conversationId),
          like(memories.content, searchTerm)
        )
      )
      .orderBy(desc(memories.createdAt))
      .limit(100);

    return res.status(200).json(searchResults);
  } catch (error) {
    console.error('Error searching memories:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get random memory
export const getRandomMemoryRoute = async (req, res) => {
  try {
    const { id: conversationId } = req.params;

    const allMemories = await db
      .select()
      .from(memories)
      .where(eq(memories.conversationId, conversationId));

    if (allMemories.length === 0) {
      return res.status(404).json({ error: 'No memories found' });
    }

    const randomIndex = Math.floor(Math.random() * allMemories.length);
    const randomMemory = allMemories[randomIndex];

    return res.status(200).json(randomMemory);
  } catch (error) {
    console.error('Error fetching random memory:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get timeline view (memories grouped by date)
export const getTimelineRoute = async (req, res) => {
  try {
    const { id: conversationId } = req.params;

    const allMemories = await db
      .select()
      .from(memories)
      .where(eq(memories.conversationId, conversationId))
      .orderBy(desc(memories.createdAt));

    const timeline = {};
    allMemories.forEach(memory => {
      const date = new Date(memory.createdAt).toISOString().split('T')[0];
      if (!timeline[date]) {
        timeline[date] = [];
      }
      timeline[date].push(memory);
    });

    return res.status(200).json(timeline);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Export all memories as JSON
export const exportMemoriesRoute = async (req, res) => {
  try {
    const { id: conversationId } = req.params;

    const allMemories = await db
      .select()
      .from(memories)
      .where(eq(memories.conversationId, conversationId))
      .orderBy(desc(memories.createdAt));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="memories-${conversationId}.json"`);
    return res.status(200).json(allMemories);
  } catch (error) {
    console.error('Error exporting memories:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get API usage analytics
export const getApiUsageRoute = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user.id;

    // Get all API requests for this user
    const allRequests = await db
      .select()
      .from(apiRequests)
      .where(eq(apiRequests.userId, userId))
      .orderBy(desc(apiRequests.createdAt));

    // Group by date and endpoint
    const daily = {};
    const total = { chat: 0, ask: 0, messages: 0 };

    allRequests.forEach(request => {
      const date = new Date(request.createdAt).toISOString().split('T')[0];
      if (!daily[date]) {
        daily[date] = { date, chat: 0, ask: 0, messages: 0 };
      }

      if (request.endpoint === '/chat') {
        daily[date].chat++;
        total.chat++;
      } else if (request.endpoint === '/ask') {
        daily[date].ask++;
        total.ask++;
      } else if (request.endpoint === '/messages') {
        daily[date].messages++;
        total.messages++;
      }
    });

    const dailyArray = Object.values(daily).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    return res.status(200).json({
      daily: dailyArray,
      total,
    });
  } catch (error) {
    console.error('Error fetching API usage:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get retrieval events
export const getRetrievalEventsRoute = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user.id;

    const events = await db
      .select()
      .from(retrievalLogs)
      .where(
        and(
          eq(retrievalLogs.userId, userId),
          eq(retrievalLogs.conversationId, conversationId)
        )
      )
      .orderBy(desc(retrievalLogs.createdAt))
      .limit(100);

    return res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching retrieval events:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get vector index health
export const getVectorHealthRoute = async (req, res) => {
  try {
    const { id: conversationId } = req.params;

    // Get total memories for this conversation
    const conversationMemories = await db
      .select()
      .from(memories)
      .where(eq(memories.conversationId, conversationId));

    const totalVectors = conversationMemories.length;

    // Get Pinecone index stats
    let indexStats = null;
    try {
      const stats = await index.describeIndexStats();
      indexStats = {
        totalVectors: stats.totalRecordCount || 0,
        dimension: stats.dimension || 1536,
        indexName: process.env.PINECONE_INDEX || 'unknown',
      };
    } catch (error) {
      console.warn('Could not fetch Pinecone stats:', error);
      indexStats = {
        totalVectors: 0,
        dimension: 1536,
        indexName: process.env.PINECONE_INDEX || 'unknown',
      };
    }

    const indexUsage = indexStats.totalVectors > 0 
      ? (totalVectors / indexStats.totalVectors) * 100 
      : 0;

    return res.status(200).json({
      conversationVectors: totalVectors,
      totalVectors: indexStats.totalVectors,
      dimension: indexStats.dimension,
      indexName: indexStats.indexName,
      indexUsage: indexUsage.toFixed(4),
    });
  } catch (error) {
    console.error('Error fetching vector health:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Add manual memory
export const addManualMemoryRoute = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'content is required and must be a non-empty string' });
    }

    let embeddingsApiKey;
    try {
      embeddingsApiKey = resolveEmbeddingsApiKey(req.body);
    } catch (error) {
      if (error instanceof LLMError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      throw error;
    }

    const [newMemory] = await db
      .insert(memories)
      .values({
        conversationId,
        content: content.trim(),
      })
      .returning();

    try {
      const embedding = await embedText(content.trim(), embeddingsApiKey);

      await index.upsert([{
        id: newMemory.id,
        values: embedding,
        metadata: {
          conversationId,
          content: content.trim(),
        },
      }]);
    } catch (error) {
      console.error('Error indexing memory to Pinecone:', error);
    }

    return res.status(201).json(newMemory);
  } catch (error) {
    console.error('Error adding manual memory:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get raw memory feed
export const getRawMemoriesRoute = async (req, res) => {
  try {
    const { id: conversationId } = req.params;

    const allMemories = await db
      .select()
      .from(memories)
      .where(eq(memories.conversationId, conversationId))
      .orderBy(desc(memories.createdAt));

    return res.status(200).json(allMemories);
  } catch (error) {
    console.error('Error fetching raw memories:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get request logs
export const getRequestLogsRoute = async (req, res) => {
  try {
    const userId = req.user.id;

    const logs = await db
      .select()
      .from(apiRequests)
      .where(eq(apiRequests.userId, userId))
      .orderBy(desc(apiRequests.createdAt))
      .limit(100);

    return res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching request logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

