import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { db } from '../config/db.js';
import { messages, summaries } from '../config/schema.js';
import { extractFacts } from '../services/extraction.js';
import { processFact } from '../services/memory-updater.js';
import { summaryUpdateQueue } from '../config/queue.js';
import { eq, and, desc } from 'drizzle-orm';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  reconnectOnError: (err) => {
    console.error('Redis connection error:', err.message);
    return true;
  },
});

connection.on('connect', () => {
  console.log('Memory processor: Redis connected');
});

connection.on('error', (err) => {
  console.error('Memory processor: Redis error:', err);
});

connection.on('ready', () => {
  console.log('Memory processor: Redis ready');
});

export const startMemoryProcessor = () => {
  if (!process.env.REDIS_URL) {
    console.error('WARNING: REDIS_URL not set. Memory processor may not work correctly.');
  }

  const worker = new Worker(
    'memory-process',
    async (job) => {
      const { conversationId, messageId } = job.data;

      try {
        const context = await fetchContext(conversationId, messageId);
        
        if (!context.newMessage) {
          console.error(`Message ${messageId} not found`);
          return;
        }

        console.log(`Extracting facts from message: "${context.newMessage.content}"`);
        const facts = await extractFacts(
          context.summary,
          context.recentMessages,
          context.previousMessage,
          context.newMessage
        );

        console.log(`Extracted ${facts.length} facts:`, facts);

        if (facts.length === 0) {
          console.log(`No facts extracted for message ${messageId}`);
          return;
        }

        const results = [];
        let memoriesAdded = 0;
        let memoriesUpdated = 0;
        
        for (const fact of facts) {
          try {
            const result = await processFact(fact, conversationId);
            results.push(result);
            
            if (result.action === 'ADD') {
              memoriesAdded++;
            } else if (result.action === 'UPDATE') {
              memoriesUpdated++;
            }
            
            if (result.action === 'UPDATE') {
              console.log(`Processed fact: ${fact} -> ${result.action} ${result.memoryId}`);
              console.log(`  Updated from: "${result.oldContent}"`);
              console.log(`  Updated to: "${result.newContent}"`);
            } else if (result.action === 'DELETE') {
              console.log(`Processed fact: ${fact} -> ${result.action} ${result.memoryId}`);
            } else {
              console.log(`Processed fact: ${fact} -> ${result.action} ${result.memoryId || ''}`);
            }
          } catch (error) {
            console.error(`Error processing fact "${fact}":`, error);
          }
        }

        if (memoriesAdded >= 3 || memoriesUpdated >= 2) {
          try {
            await summaryUpdateQueue.add(
              'update',
              { conversationId },
              {
                delay: 5000,
                jobId: `summary-${conversationId}-${Date.now()}`,
              }
            );
            console.log(`Queued summary update for conversation ${conversationId} (${memoriesAdded} added, ${memoriesUpdated} updated)`);
          } catch (error) {
            console.error(`Error queueing summary update:`, error);
          }
        }

        return { factsProcessed: facts.length, results };
      } catch (error) {
        console.error(`Error processing memory job for message ${messageId}:`, error);
        throw error;
      }
    },
    {
      connection,
      concurrency: 5,
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 24 * 3600,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`Memory processing job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Memory processing job ${job.id} failed:`, err);
  });

  console.log('Memory processor worker started');
  return worker;
};

const fetchContext = async (conversationId, messageId) => {
  const [newMessage] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!newMessage) {
    return { newMessage: null, previousMessage: null, summary: '', recentMessages: [] };
  }

  const allMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  const currentIndex = allMessages.findIndex(msg => msg.id === messageId);
  const previousMessage = currentIndex > 0 ? allMessages[currentIndex - 1] : null;

  const [summaryRow] = await db
    .select()
    .from(summaries)
    .where(eq(summaries.conversationId, conversationId))
    .limit(1);

  const summary = summaryRow?.text || '';

  const recentMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(10);

  recentMessages.reverse();

  return {
    newMessage,
    previousMessage,
    summary,
    recentMessages,
  };
};

