import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { db } from '../config/db.js';
import { apiRequests, retrievalLogs } from '../config/schema.js';

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const startLoggingProcessor = () => {
  const worker = new Worker(
    'logging',
    async (job) => {
      const { type, data } = job.data;

      try {
        if (type === 'api_request') {
          await db.insert(apiRequests).values({
            userId: data.userId,
            endpoint: data.endpoint,
            statusCode: data.statusCode,
            durationMs: data.durationMs,
          });
        } 
        // else if (type === 'retrieval') {
        //   await db.insert(retrievalLogs).values({
        //     userId: data.userId,
        //     conversationId: data.conversationId,
        //     question: data.question,
        //     topMemoryIds: data.topMemoryIds,
        //     latencyMs: data.latencyMs,
        //   });
        // }
      } catch (error) {
        console.error('Error processing logging job:', error);
        throw error;
      }
    },
    {
      connection,
      concurrency: 10,
    }
  );

  worker.on('completed', (job) => {
  });

  worker.on('failed', (job, err) => {
    console.error(`Logging job ${job.id} failed:`, err);
  });

  console.log('Logging processor started');
  return worker;
};

