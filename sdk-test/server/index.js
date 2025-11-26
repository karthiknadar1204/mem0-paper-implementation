import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bodyParser from 'body-parser';
import memory from './memory.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5008',
  'https://mem0-paper-implementation-production.up.railway.app'
];

const allowSubdomain = (origin = '', domainSuffix = '') =>
  origin.toLowerCase().endsWith(domainSuffix.toLowerCase());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      allowSubdomain(origin, '.ngrok-free.app') ||
      allowSubdomain(origin, '.ngrok.io')
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'sdk-test-server' });
});

app.post('/say', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'message is required and must be a non-empty string'
      });
    }

    const response = await memory.say(message.trim());

    return res.status(200).json({
      success: true,
      message: message.trim(),
      response,
      method: 'say',
      description: 'Auto-routed to chat or ask based on message content',
    });
  } catch (error) {
    console.error('Error in /say endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'message is required and must be a non-empty string'
      });
    }

    const reply = await memory.chat(message.trim());

    return res.status(200).json({
      success: true,
      message: message.trim(),
      reply,
      method: 'chat',
      description: 'Normal conversation with immediate LLM response',
    });
  } catch (error) {
    console.error('Error in /chat endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        error: 'question is required and must be a non-empty string'
      });
    }

    const answer = await memory.ask(question.trim());

    return res.status(200).json({
      success: true,
      question: question.trim(),
      answer,
      method: 'ask',
      description: 'Uses stored memories from Pinecone to answer questions',
    });
  } catch (error) {
    console.error('Error in /ask endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 5008;
app.listen(PORT, () => {
  console.log(`SDK Test Server is running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  POST /say   - Auto-routing (chat or ask)`);
  console.log(`  POST /chat  - Normal conversation`);
  console.log(`  POST /ask   - Memory recall`);
  console.log(`  GET  /health - Health check`);
});
