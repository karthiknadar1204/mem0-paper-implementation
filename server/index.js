import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createConversationRoute, getConversationsRoute } from './routes/conversations.js';
import { createMessageRoute } from './routes/messages.js';
import { askRoute } from './routes/ask.js';
import { registerRoute, loginRoute, logoutRoute } from './routes/auth.js';
import { createApiKeyRoute } from './routes/api-keys.js';
import { authenticate } from './middleware/auth.js';
import { startMemoryProcessor } from './workers/memory-processor.js';
import { startSummaryProcessor } from './workers/summary-processor.js';
import { summaryUpdateQueue } from './config/queue.js';
import { db } from './config/db.js';
import { conversations } from './config/schema.js';
import bodyParser from 'body-parser';

dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: Origin ' + origin + ' not allowed'));
    }
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
  res.json({ status: 'ok' });
});

app.post('/register', registerRoute);
app.post('/login', loginRoute);
app.post('/logout', logoutRoute);
app.get('/conversations', authenticate, getConversationsRoute);
app.post('/conversations', authenticate, createConversationRoute);
app.post('/conversations/:id/messages', authenticate, createMessageRoute);
app.post('/conversations/:id/ask', askRoute);
app.post('/api-keys', authenticate, createApiKeyRoute);

const PORT = process.env.PORT || 4000;


const setupPeriodicSummaryJobs = async () => {
  try {

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
  
  startMemoryProcessor();
  startSummaryProcessor();
  
  await setupPeriodicSummaryJobs();
});