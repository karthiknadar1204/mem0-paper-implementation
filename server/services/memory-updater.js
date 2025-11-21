import openai from '../utils/openai.js';
import { index } from '../utils/pinecone.js';
import { db } from '../config/db.js';
import { memories } from '../config/schema.js';
import { buildToolCallingPrompt } from '../utils/prompts.js';
import { eq } from 'drizzle-orm';

const SIMILARITY_THRESHOLD = 0.5;

export const processFact = async (fact, conversationId) => {
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: fact,
    });
    const embedding = embeddingResponse.data[0].embedding;

    const conversationMemories = await db
      .select({ id: memories.id })
      .from(memories)
      .where(eq(memories.conversationId, conversationId));

    const similarMemories = [];
    
    if (conversationMemories.length > 0) {
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

    const decision = await decideAction(fact, similarMemories);

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
          content: 'You are a memory management system. Decide whether to ADD, UPDATE, or DELETE a memory based on the candidate fact and existing similar memories.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      tools: [
        {
          type: 'function',
          function: {
            name: 'decide_memory_action',
            description: 'Decide what action to take on a memory: ADD (new fact), UPDATE (refines existing), or DELETE (contradicts existing)',
            parameters: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['ADD', 'UPDATE', 'DELETE'],
                  description: 'The action to take: ADD for new facts, UPDATE to refine existing memory, DELETE to remove contradicted memory',
                },
                memoryId: {
                  type: 'string',
                  description: 'The ID of the existing memory (required for UPDATE and DELETE, null for ADD)',
                },
              },
              required: ['action'],
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'decide_memory_action' } },
    });

    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'decide_memory_action') {
      console.warn('No tool call returned, defaulting to ADD');
      return { action: 'ADD', memoryId: null };
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return {
      action: parsed.action || 'ADD',
      memoryId: parsed.memoryId || null,
    };
  } catch (error) {
    console.error('Error deciding action:', error);
    return { action: 'ADD', memoryId: null };
  }
};

const executeAction = async (decision, fact, conversationId, embedding) => {
  const { action, memoryId } = decision;

  switch (action) {
    case 'ADD': {
      const [newMemory] = await db
        .insert(memories)
        .values({
          conversationId,
          content: fact,
        })
        .returning();

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

      const [oldMemory] = await db
        .select()
        .from(memories)
        .where(eq(memories.id, memoryId))
        .limit(1);

      const oldContent = oldMemory?.content || 'unknown';

      await db
        .update(memories)
        .set({
          content: fact,
          updatedAt: new Date(),
        })
        .where(eq(memories.id, memoryId));

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

      await db.delete(memories).where(eq(memories.id, memoryId));

      await index.deleteMany([memoryId]);

      return { action: 'DELETE', memoryId };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
};

