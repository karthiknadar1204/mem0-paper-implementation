import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { db } from '../config/db.js';
import { messages, summaries } from '../config/schema.js';
import { extractFacts } from '../services/extraction.js';
import { processFact } from '../services/memory-updater.js';
import { updateSummary } from '../services/summary.js';
import { eq, and, desc } from 'drizzle-orm';

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const startMemoryProcessor = () => {
  const worker = new Worker(
    'memory-process',
    async (job) => {
      const { conversationId, messageId } = job.data;

      try {
        // Step 1: Fetch context
        const context = await fetchContext(conversationId, messageId);
        
        if (!context.newMessage) {
          console.error(`Message ${messageId} not found`);
          return;
        }

        // Step 2: Extract facts
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

        // Step 3: Process each fact (ADD/UPDATE/DELETE)
        const results = [];
        for (const fact of facts) {
          try {
            const result = await processFact(fact, conversationId);
            results.push(result);
            
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
            // Continue with other facts even if one fails
          }
        }

        // Step 4: Update summary periodically (every 10-15 messages)
        const messageCount = context.recentMessages.length;
        if (messageCount % 10 === 0 || messageCount === 1) {
          try {
            await updateSummary(conversationId);
            console.log(`Summary updated for conversation ${conversationId}`);
          } catch (error) {
            console.error(`Error updating summary:`, error);
            // Don't fail the job if summary update fails
          }
        }

        return { factsProcessed: facts.length, results };
      } catch (error) {
        console.error(`Error processing memory job for message ${messageId}:`, error);
        throw error; // Re-throw to trigger retry
      }
    },
    {
      connection,
      concurrency: 5, // Process up to 5 jobs concurrently
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 24 * 3600, // Keep failed jobs for 24 hours
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
  // Fetch new message
  const [newMessage] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!newMessage) {
    return { newMessage: null, previousMessage: null, summary: '', recentMessages: [] };
  }

  // Fetch all messages to find the previous one
  const allMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  const currentIndex = allMessages.findIndex(msg => msg.id === messageId);
  const previousMessage = currentIndex > 0 ? allMessages[currentIndex - 1] : null;

  // Fetch summary
  const [summaryRow] = await db
    .select()
    .from(summaries)
    .where(eq(summaries.conversationId, conversationId))
    .limit(1);

  const summary = summaryRow?.text || '';

  // Fetch last 10 messages
  const recentMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(10);

  // Reverse to get chronological order
  recentMessages.reverse();

  return {
    newMessage,
    previousMessage,
    summary,
    recentMessages,
  };
};

