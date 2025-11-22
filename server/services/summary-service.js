import openai from '../utils/openai.js';
import { db } from '../config/db.js';
import { summaries, messages, conversations } from '../config/schema.js';
import { buildSummaryPrompt } from '../utils/prompts.js';
import { eq, desc } from 'drizzle-orm';

export const generateSummary = async (conversationId) => {
  try {

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation) {
      console.log(`Conversation ${conversationId} does not exist, skipping summary generation`);
      return '';
    }

    const [summaryRow] = await db
      .select()
      .from(summaries)
      .where(eq(summaries.conversationId, conversationId))
      .limit(1);

    const currentSummary = summaryRow?.text || '';

    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(50);

    recentMessages.reverse();

    if (recentMessages.length === 0) {
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
        try {
          await db.insert(summaries).values({
            conversationId,
            text: '',
          });
        } catch (insertError) {
          console.warn(`Could not insert summary for conversation ${conversationId}:`, insertError.message);
        }
      }
      return '';
    }

    const prompt = buildSummaryPrompt(currentSummary, recentMessages);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a summarization system. Create concise, factual summaries of user information from conversations.',
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
      try {
        await db.insert(summaries).values({
          conversationId,
          text: summaryText,
        });
      } catch (insertError) {
        console.warn(`Could not insert summary for conversation ${conversationId}:`, insertError.message);
      }
    }

    return summaryText;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
};

