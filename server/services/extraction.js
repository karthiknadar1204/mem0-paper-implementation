import { buildExtractionPrompt } from '../utils/prompts.js';
import { runChatCompletion } from '../utils/llm-client.js';

export const extractFacts = async (llm, summary, recentMessages, previousMessage, newMessage) => {
  try {
    const prompt = buildExtractionPrompt(summary, recentMessages, previousMessage, newMessage);

    console.log('Extracting facts with prompt:', prompt);
    const content = await runChatCompletion({
      context: llm,
      messages: [
        {
          role: 'system',
          content: 'You are a fact extraction system. Extract ONLY new facts from the NEW message provided. Do NOT re-extract facts that already exist in the conversation summary or recent messages. Focus strictly on what is NEW in the latest message. Return a JSON object with a "facts" array of strings.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      responseFormat: { type: 'json_object' },
    });

    const parsed = JSON.parse(content);
    const facts = parsed.facts || [];

    if (!Array.isArray(facts)) {
      return [];
    }

    return facts.filter(fact => typeof fact === 'string' && fact.trim().length > 0);
  } catch (error) {
    console.error('Error extracting facts:', error);
    return [];
  }
};
