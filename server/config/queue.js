import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,  
  enableReadyCheck: false,     
});

export const memoryLogQueue = new Queue('memory-log', {
  connection,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: 10 },
});

export const memoryProcessQueue = new Queue('memory-process', {
  connection,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: 10 },
});
