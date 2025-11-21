import openai from '../utils/openai.js';
import { buildExtractionPrompt } from '../utils/prompts.js';

export const extractFacts = async (summary, recentMessages, previousMessage, newMessage) => {
  try {
    const prompt = buildExtractionPrompt(summary, recentMessages, previousMessage, newMessage);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
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

