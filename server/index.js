import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createConversationRoute, getConversationsRoute } from './routes/conversations.js';
import { createMessageRoute } from './routes/messages.js';
import { askRoute } from './routes/ask.js';
import { chatRoute } from './routes/chat.js';
import { registerRoute, loginRoute, logoutRoute } from './routes/auth.js';
import { createApiKeyRoute, getApiKeysRoute } from './routes/api-keys.js';
import {
  getMemoriesRoute,
  getOnThisDayRoute,
  searchMemoriesRoute,
  getRandomMemoryRoute,
  getTimelineRoute,
  exportMemoriesRoute,
  getApiUsageRoute,
  getRetrievalEventsRoute,
  getVectorHealthRoute,
  addManualMemoryRoute,
  getRawMemoriesRoute,
  getRequestLogsRoute,
} from './routes/dashboard.js';
import { authenticate } from './middleware/auth.js';
import { startMemoryProcessor } from './workers/memory-processor.js';
import { startSummaryProcessor } from './workers/summary-processor.js';
import { startLoggingProcessor } from './workers/logging-processor.js';
import { summaryUpdateQueue } from './config/queue.js';
import { db } from './config/db.js';
import { conversations } from './config/schema.js';
import bodyParser from 'body-parser';

dotenv.config();

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with or without explicit Origin header by reflecting the caller.
    if (!origin) return callback(null, true);
    return callback(null, origin);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
}));

app.use(express.json({ strict: false }));
app.use(cookieParser());
app.use(bodyParser.json());

app.get('/health', async (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'normal-memory-api',
    uptime: process.uptime(),
  });
});


app.post('/register', registerRoute);
app.post('/login', loginRoute);
app.post('/logout', logoutRoute);
app.get('/conversations', authenticate, getConversationsRoute);
app.post('/conversations', authenticate, createConversationRoute);
app.post('/conversations/:id/messages', authenticate, createMessageRoute);
app.post('/conversations/:id/chat', authenticate, chatRoute);
app.post('/conversations/:id/ask', authenticate, askRoute);
app.get('/api-keys', authenticate, getApiKeysRoute);
app.post('/api-keys', authenticate, createApiKeyRoute);

// Dashboard routes - "Your Mind" tab
app.get('/conversations/:id/memories', authenticate, getMemoriesRoute);
app.get('/conversations/:id/memories/on-this-day', authenticate, getOnThisDayRoute);
app.get('/conversations/:id/memories/search', authenticate, searchMemoriesRoute);
app.get('/conversations/:id/memories/random', authenticate, getRandomMemoryRoute);
app.get('/conversations/:id/memories/timeline', authenticate, getTimelineRoute);
app.get('/conversations/:id/memories/export', authenticate, exportMemoriesRoute);

// Dashboard routes - "Developer Portal" tab
app.get('/conversations/:id/analytics/usage', authenticate, getApiUsageRoute);
app.get('/conversations/:id/analytics/retrievals', authenticate, getRetrievalEventsRoute);
app.get('/conversations/:id/analytics/vector-health', authenticate, getVectorHealthRoute);
app.post('/conversations/:id/memories/manual', authenticate, addManualMemoryRoute);
app.get('/conversations/:id/memories/raw', authenticate, getRawMemoriesRoute);
app.get('/conversations/:id/analytics/requests', authenticate, getRequestLogsRoute);

const PORT = process.env.PORT || 4000;


const setupPeriodicSummaryJobs = async () => {
  try {
    const repeatableJobs = await summaryUpdateQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.id && job.id.startsWith('summary-periodic-')) {
        await summaryUpdateQueue.removeRepeatableByKey(job.key);
      }
    }
    console.log(`Removed ${repeatableJobs.length} old periodic summary jobs`);

    const allConversations = await db.select().from(conversations);
    
    for (const conversation of allConversations) {
      await summaryUpdateQueue.add(
        'periodic',
        { conversationId: conversation.id },
        {
          repeat: {
            every: 3 * 60 * 1000,
          },
          jobId: `summary-periodic-${conversation.id}`,
        }
      );
    }
    
    console.log(`Scheduled periodic summary updates for ${allConversations.length} conversations`);
  } catch (error) {
    console.error('Error setting up periodic summary jobs:', error);
  }
};

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Redis URL: ${process.env.REDIS_URL ? 'Set' : 'NOT SET - Workers may not work!'}`);
  
  try {
  startMemoryProcessor();
  startSummaryProcessor();
    startLoggingProcessor();
    console.log('All background workers started');
  } catch (error) {
    console.error('Error starting background workers:', error);
  }
  
  try {
  await setupPeriodicSummaryJobs();
  } catch (error) {
    console.error('Error setting up periodic jobs:', error);
  }
});