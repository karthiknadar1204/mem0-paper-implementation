import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { db } from '../config/db.js';
import { apiRequests, retrievalLogs } from '../config/schema.js';

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
  console.log('Logging processor: Redis connected');
});

connection.on('error', (err) => {
  console.error('Logging processor: Redis error:', err);
});

connection.on('ready', () => {
  console.log('Logging processor: Redis ready');
});

export const startLoggingProcessor = () => {
  if (!process.env.REDIS_URL) {
    console.error('WARNING: REDIS_URL not set. Logging processor may not work correctly.');
  }

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

