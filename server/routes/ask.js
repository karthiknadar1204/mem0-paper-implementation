import { retrieveRelevantMemories } from '../services/retrieval.js';
import { buildAnswerPrompt } from '../utils/prompts.js';
import openai from '../utils/openai.js';
import { loggingQueue } from '../config/queue.js';

export const askRoute = async (req, res) => {
  const start = Date.now();
  let statusCode = 200;
  
  try {
    const { id: conversationId } = req.params;
    const { question } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      statusCode = 400;
      return res.status(400).json({ error: 'question is required and must be a non-empty string' });
    }

    const retrievalStart = Date.now();
    const relevantMemories = await retrieveRelevantMemories(question, conversationId);
    const retrievalLatency = Date.now() - retrievalStart;

    const prompt = buildAnswerPrompt(relevantMemories, question);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an intelligent assistant with perfect long-term memory. Answer questions accurately using only the provided memories. Understand implied questions, temporal context, and relationship status changes. Always provide the most current information based on the memories provided.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const answer = response.choices[0].message.content.trim();
    const durationMs = Date.now() - start;

    const topMemoryIds = relevantMemories
      .map(m => m.id)
      .filter(id => id !== undefined && id !== null);
    
    loggingQueue.add('log', {
      type: 'retrieval',
      data: {
        userId: req.user.id,
        conversationId,
        question: question.trim(),
        topMemoryIds: topMemoryIds.length > 0 ? topMemoryIds : null,
        latencyMs: retrievalLatency,
      },
    }).catch(error => {
      console.error('Error queueing retrieval log:', error);
    });

    loggingQueue.add('log', {
      type: 'api_request',
      data: {
        userId: req.user.id,
        endpoint: '/ask',
        statusCode: 200,
        durationMs,
      },
    }).catch(error => {
      console.error('Error queueing API request log:', error);
    });

    return res.status(200).json({
      answer,
      memoriesUsed: relevantMemories.length,
    });
  } catch (error) {
    console.error('Error in ask route:', error);
    statusCode = 500;
    const durationMs = Date.now() - start;
    
    loggingQueue.add('log', {
      type: 'api_request',
      data: {
        userId: req.user.id,
        endpoint: '/ask',
        statusCode,
        durationMs,
      },
    }).catch(logError => {
      console.error('Error queueing API request log:', logError);
    });
    
    return res.status(500).json({ error: 'Internal server error' });
  }
};

