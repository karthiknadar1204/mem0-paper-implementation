import openai from '../utils/openai.js';
import { index } from '../utils/pinecone.js';
import { db } from '../config/db.js';
import { memories } from '../config/schema.js';
import { buildToolCallingPrompt } from '../utils/prompts.js';
import { eq } from 'drizzle-orm';

const SIMILARITY_THRESHOLD = 0.5;

export const processFact = async (fact, conversationId) => {
  try {
    // Step 1: Generate embedding for the candidate fact
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: fact,
    });
    const embedding = embeddingResponse.data[0].embedding;

    // Step 2: Search Pinecone for similar memories in this conversation
    // First, get all memory IDs for this conversation from DB
    const conversationMemories = await db
      .select({ id: memories.id })
      .from(memories)
      .where(eq(memories.conversationId, conversationId));

    const similarMemories = [];
    
    if (conversationMemories.length > 0) {
      // Query Pinecone with filter
      try {
        const queryResponse = await index.query({
          vector: embedding,
          topK: Math.min(10, conversationMemories.length),
          includeMetadata: true,
          filter: {
            conversationId: { $eq: conversationId },
          },
        });

        if (queryResponse.matches && queryResponse.matches.length > 0) {
          for (const match of queryResponse.matches) {
            if (match.score >= SIMILARITY_THRESHOLD) {
              // Verify it belongs to this conversation and fetch from DB
              const [memory] = await db
                .select()
                .from(memories)
                .where(eq(memories.id, match.id))
                .limit(1);
              
              if (memory && memory.conversationId === conversationId) {
                similarMemories.push({
                  id: memory.id,
                  content: memory.content,
                  score: match.score,
                });
              }
            }
          }
        }
      } catch (filterError) {
        // If filter doesn't work, query without filter and filter in code
        console.warn('Pinecone filter not supported, filtering in code:', filterError);
        const queryResponse = await index.query({
          vector: embedding,
          topK: Math.min(10, conversationMemories.length),
          includeMetadata: true,
        });

        if (queryResponse.matches && queryResponse.matches.length > 0) {
          const conversationMemoryIds = new Set(conversationMemories.map(m => m.id));
          
          for (const match of queryResponse.matches) {
            if (match.score >= SIMILARITY_THRESHOLD && conversationMemoryIds.has(match.id)) {
              const [memory] = await db
                .select()
                .from(memories)
                .where(eq(memories.id, match.id))
                .limit(1);
              
              if (memory) {
                similarMemories.push({
                  id: memory.id,
                  content: memory.content,
                  score: match.score,
                });
              }
            }
          }
        }
      }
    }

    // Step 3: Tool-calling LLM to decide action
    const decision = await decideAction(fact, similarMemories);

    // Step 4: Execute the action
    return await executeAction(decision, fact, conversationId, embedding);
  } catch (error) {
    console.error('Error processing fact:', error);
    throw error;
  }
};

const decideAction = async (fact, similarMemories) => {
  try {
    const prompt = buildToolCallingPrompt(fact, similarMemories);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a memory management system. Decide whether to ADD, UPDATE, or DELETE a memory based on the candidate fact and existing similar memories. Always return your decision as a JSON object.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);

    return {
      action: parsed.action || 'ADD',
      memoryId: parsed.memoryId || null,
    };
  } catch (error) {
    console.error('Error deciding action:', error);
    // Default to ADD if decision fails
    return { action: 'ADD', memoryId: null };
  }
};

const executeAction = async (decision, fact, conversationId, embedding) => {
  const { action, memoryId } = decision;

  switch (action) {
    case 'ADD': {
      // Insert into database
      const [newMemory] = await db
        .insert(memories)
        .values({
          conversationId,
          content: fact,
        })
        .returning();

      // Upsert to Pinecone
      await index.upsert([
        {
          id: newMemory.id,
          values: embedding,
          metadata: {
            conversationId,
            content: fact,
          },
        },
      ]);

      return { action: 'ADD', memoryId: newMemory.id };
    }

    case 'UPDATE': {
      if (!memoryId) {
        throw new Error('UPDATE action requires memoryId');
      }

      // Fetch old memory to show what's being updated
      const [oldMemory] = await db
        .select()
        .from(memories)
        .where(eq(memories.id, memoryId))
        .limit(1);

      const oldContent = oldMemory?.content || 'unknown';

      // Update database
      await db
        .update(memories)
        .set({
          content: fact,
          updatedAt: new Date(),
        })
        .where(eq(memories.id, memoryId));

      // Upsert to Pinecone (same ID, overwrites old embedding)
      await index.upsert([
        {
          id: memoryId,
          values: embedding,
          metadata: {
            conversationId,
            content: fact,
          },
        },
      ]);

      return { action: 'UPDATE', memoryId, oldContent, newContent: fact };
    }

    case 'DELETE': {
      if (!memoryId) {
        throw new Error('DELETE action requires memoryId');
      }

      // Delete from database
      await db.delete(memories).where(eq(memories.id, memoryId));

      // Delete from Pinecone
      await index.deleteMany([memoryId]);

      return { action: 'DELETE', memoryId };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
};

