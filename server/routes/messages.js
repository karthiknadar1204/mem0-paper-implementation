import { db } from '../config/db.js';
import { messages } from '../config/schema.js';
import { memoryProcessQueue } from '../config/queue.js';

export const createMessageRoute = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { role, content } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: 'role and content are required' });
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

