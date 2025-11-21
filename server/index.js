import express from 'express';
import dotenv from 'dotenv';
import { createConversationRoute } from './routes/conversations.js';
import { createMessageRoute } from './routes/messages.js';
import { startMemoryProcessor } from './workers/memory-processor.js';

dotenv.config();

const app = express();
app.use(express.json({ strict: false }));

app.get('/health', async (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/conversations', createConversationRoute);
app.post('/conversations/:id/messages', createMessageRoute);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startMemoryProcessor();
});