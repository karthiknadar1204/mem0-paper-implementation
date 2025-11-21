import express from 'express';
import dotenv from 'dotenv';
import { createConversationRoute } from './routes/conversations.js';
import { createMessageRoute } from './routes/messages.js';
import { startMemoryProcessor } from './workers/memory-processor.js';
import { startSummaryProcessor } from './workers/summary-processor.js';
import { summaryUpdateQueue } from './config/queue.js';
import { db } from './config/db.js';
import { conversations } from './config/schema.js';

dotenv.config();

const app = express();
app.use(express.json({ strict: false }));

app.get('/health', async (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/conversations', createConversationRoute);
app.post('/conversations/:id/messages', createMessageRoute);

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