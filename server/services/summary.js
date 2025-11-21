import openai from '../utils/openai.js';
import { db } from '../config/db.js';
import { summaries, memories } from '../config/schema.js';
import { buildSummaryPrompt } from '../utils/prompts.js';
import { eq } from 'drizzle-orm';

export const updateSummary = async (conversationId) => {
  try {
    const allMemories = await db
      .select()
      .from(memories)
      .where(eq(memories.conversationId, conversationId));

    if (allMemories.length === 0) {
      const existing = await db
        .select()
        .from(summaries)
        .where(eq(summaries.conversationId, conversationId))
        .limit(1);
      
      if (existing.length > 0) {
        await db
          .update(summaries)
          .set({ text: '', updatedAt: new Date() })
          .where(eq(summaries.conversationId, conversationId));
      } else {
        await db.insert(summaries).values({
          conversationId,
          text: '',
        });
      }
      return '';
    }

    const prompt = buildSummaryPrompt(allMemories);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a summarization system. Create concise summaries of user information.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    const summaryText = response.choices[0].message.content.trim();

    const existing = await db
      .select()
      .from(summaries)
      .where(eq(summaries.conversationId, conversationId))
      .limit(1);
    
    if (existing.length > 0) {
      await db
        .update(summaries)
        .set({ text: summaryText, updatedAt: new Date() })
        .where(eq(summaries.conversationId, conversationId));
    } else {
      await db.insert(summaries).values({
        conversationId,
        text: summaryText,
      });
    }

    return summaryText;
  } catch (error) {
    console.error('Error updating summary:', error);
    throw error;
  }
};

