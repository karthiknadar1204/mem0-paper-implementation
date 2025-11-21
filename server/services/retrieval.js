import openai from '../utils/openai.js';
import { index } from '../utils/pinecone.js';
import { db } from '../config/db.js';
import { memories } from '../config/schema.js';
import { eq } from 'drizzle-orm';

const TOP_K = 25;

export const retrieveRelevantMemories = async (question, conversationId) => {
    try {
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: question,
        });
        const questionEmbedding = embeddingResponse.data[0].embedding;

        const conversationMemories = await db
            .select({ id: memories.id })
            .from(memories)
            .where(eq(memories.conversationId, conversationId));

        if (conversationMemories.length === 0) {
            return [];
        }

        let queryResponse;
        try {
            queryResponse = await index.query({
                vector: questionEmbedding,
                topK: Math.min(TOP_K, conversationMemories.length),
                includeMetadata: true,
                filter: {
                    conversationId: { $eq: conversationId },
                },
            });
        } catch (filterError) {
            console.warn('Pinecone filter not supported, filtering in code:', filterError);
            queryResponse = await index.query({
                vector: questionEmbedding,
                topK: Math.min(TOP_K, conversationMemories.length),
                includeMetadata: true,
            });
        }

        const memoryIds = [];
        if (queryResponse.matches && queryResponse.matches.length > 0) {
            const conversationMemoryIds = new Set(conversationMemories.map(m => m.id));

            for (const match of queryResponse.matches) {
                if (conversationMemoryIds.has(match.id)) {
                    memoryIds.push(match.id);
                }
            }
        }
        console.log('memoryIds', memoryIds);

        if (memoryIds.length === 0) {
            return [];
        }

        const retrievedMemories = await db
            .select()
            .from(memories)
            .where(eq(memories.conversationId, conversationId));

        const memoryIdsSet = new Set(memoryIds);
        const memoryMap = new Map();
        retrievedMemories.forEach(mem => {
            if (memoryIdsSet.has(mem.id)) {
                memoryMap.set(mem.id, mem.content);
            }
        });
        console.log('memoryMap', memoryMap);
        console.log('retrievedMemories', retrievedMemories);

        const relevantMemories = memoryIds
            .map(id => memoryMap.get(id))
            .filter(content => content !== undefined);
        console.log('relevantMemories', relevantMemories);
        return relevantMemories;
    } catch (error) {
        console.error('Error retrieving memories:', error);
        throw error;
    }
};

