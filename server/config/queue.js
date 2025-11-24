import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,  
  enableReadyCheck: false,     
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    console.error('Queue Redis connection error:', err.message);
    return true;
  },
});

connection.on('connect', () => {
  console.log('Queue: Redis connected');
});

connection.on('error', (err) => {
  console.error('Queue: Redis error:', err);
});

connection.on('ready', () => {
  console.log('Queue: Redis ready');
});

if (!process.env.REDIS_URL) {
  console.error('WARNING: REDIS_URL not set. Queues may not work correctly.');
}

export const memoryLogQueue = new Queue('memory-log', {
  connection,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: 10 },
});

export const memoryProcessQueue = new Queue('memory-process', {
  connection,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: 10 },
});

export const summaryUpdateQueue = new Queue('summary-update', {
  connection,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: 10 },
});

export const loggingQueue = new Queue('logging', {
  connection,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: 10 },
});
