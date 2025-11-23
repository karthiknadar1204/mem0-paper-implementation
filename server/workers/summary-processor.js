import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { generateSummary } from '../services/summary-service.js';
import { summaryUpdateQueue } from '../config/queue.js';
import { db } from '../config/db.js';
import { conversations } from '../config/schema.js';
import { eq } from 'drizzle-orm';

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const startSummaryProcessor = () => {
  const worker = new Worker(
    'summary-update',
    async (job) => {
      const { conversationId } = job.data;

      try {
        const [conversation] = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, conversationId))
          .limit(1);

        if (!conversation) {
          console.log(`Conversation ${conversationId} does not exist, removing periodic job`);
          try {
            const periodicJobId = `summary-periodic-${conversationId}`;
            const repeatableJobs = await summaryUpdateQueue.getRepeatableJobs();
            const jobToRemove = repeatableJobs.find(j => j.id === periodicJobId);
            if (jobToRemove) {
              await summaryUpdateQueue.removeRepeatableByKey(jobToRemove.key);
              console.log(`Removed periodic job for non-existent conversation ${conversationId}`);
            }
          } catch (removeError) {
            console.error(`Error removing periodic job for ${conversationId}:`, removeError);
          }
          return { skipped: true, reason: 'conversation_not_found' };
        }

        console.log(`Processing summary update for conversation ${conversationId}`);
        const summaryText = await generateSummary(conversationId);
        console.log(`Summary updated for conversation ${conversationId}`);
        return { summaryLength: summaryText.length };
      } catch (error) {
        console.error(`Error processing summary job for conversation ${conversationId}:`, error);
        throw error;
      }
    },
    {
      connection,
      concurrency: 3,
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
    console.log(`Summary update job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Summary update job ${job.id} failed:`, err);
  });

  console.log('Summary processor worker started');
  return worker;
};

