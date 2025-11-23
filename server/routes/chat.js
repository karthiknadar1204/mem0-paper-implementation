import { db } from '../config/db.js';
import { messages, summaries } from '../config/schema.js';
import { memoryProcessQueue } from '../config/queue.js';
import { eq, desc } from 'drizzle-orm';
import openai from '../utils/openai.js';

export const chatRoute = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'message is required and must be a non-empty string' });
    }

    const [userMessage] = await db
      .insert(messages)
      .values({
        conversationId,
        role: 'user',
        content: message.trim(),
      })
      .returning();

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
      .limit(20);

    recentMessages.reverse();

    const contextMessages = [];
    
    if (currentSummary) {
      contextMessages.push({
        role: 'system',
        content: `Previous conversation summary: ${currentSummary}`,
      });
    }

    const messagesToInclude = recentMessages.filter(m => m.id !== userMessage.id);
    for (const msg of messagesToInclude) {
      contextMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    contextMessages.push({
      role: 'user',
      content: message.trim(),
    });

    const llmResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful, friendly assistant with access to conversation history. Respond naturally and conversationally based on the context provided.',
        },
        ...contextMessages,
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const assistantReply = llmResponse.choices[0].message.content.trim();

    const [assistantMessage] = await db
      .insert(messages)
      .values({
        conversationId,
        role: 'assistant',
        content: assistantReply,
      })
      .returning();

    memoryProcessQueue.add('memory-process', {
      conversationId,
      messageId: userMessage.id,
    }).catch(error => {
      console.error('Error queueing memory job:', error);
    });

    return res.status(200).json({
      reply: assistantReply,
      messageId: assistantMessage.id,
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

