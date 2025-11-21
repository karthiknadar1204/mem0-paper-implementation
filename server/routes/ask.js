import { retrieveRelevantMemories } from '../services/retrieval.js';
import { buildAnswerPrompt } from '../utils/prompts.js';
import openai from '../utils/openai.js';

export const askRoute = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { question } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'question is required and must be a non-empty string' });
    }

    const relevantMemories = await retrieveRelevantMemories(question, conversationId);

    const prompt = buildAnswerPrompt(relevantMemories, question);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an intelligent assistant with perfect long-term memory. Answer questions accurately using only the provided memories.',
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

    return res.status(200).json({
      answer,
      memoriesUsed: relevantMemories.length,
    });
  } catch (error) {
    console.error('Error in ask route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

