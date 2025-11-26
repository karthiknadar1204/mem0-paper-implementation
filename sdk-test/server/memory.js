import { NormalMemory } from 'normal-memory';
import dotenv from 'dotenv';

dotenv.config();

const userLlmKey = process.env.OPENAI_KEY;


const memory = new NormalMemory({
  apiKey: 'sk_8d93146f1647f21e8f519a72858add000ad7566739e3b5358d15f4ecab49bc25',
  conversationId: 'e6b3a17f-8510-4dc1-825d-9d934f239e27',
  baseUrl: 'https://mem0-paper-implementation-production.up.railway.app',
  llmProvider: 'openai',
  llmApiKey: userLlmKey,
  llmModel: 'gpt-4o-mini',
});

export default memory;

