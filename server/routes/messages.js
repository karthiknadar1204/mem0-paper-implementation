import { db } from '../config/db.js';
import { messages } from '../config/schema.js';
import { memoryProcessQueue } from '../config/queue.js';
import { resolveLLMRequest, resolveEmbeddingsApiKey, LLMError } from '../utils/llm-client.js';

export const createMessageRoute = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { role, content } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: 'role and content are required' });
    }

    let llmParams;
    let embeddingsApiKey;
    try {
      llmParams = resolveLLMRequest(req.body);
      embeddingsApiKey = resolveEmbeddingsApiKey(req.body);
    } catch (error) {
      if (error instanceof LLMError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      throw error;
    }

    const [message] = await db
      .insert(messages)
      .values({
        conversationId,
        role,
        content,
      })
      .returning();

    await memoryProcessQueue.add('process', {
      conversationId,
      messageId: message.id,
      llmParams,
      embeddingsApiKey,
    });

    return res.status(202).json({
      status: 'accepted',
      messageId: message.id,
    });
  } catch (error) {
    console.error('Error creating message:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
