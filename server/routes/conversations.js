import { db } from '../config/db.js';
import { conversations } from '../config/schema.js';
import { summaryUpdateQueue } from '../config/queue.js';

export const createConversationRoute = async (req, res) => {
  try {
    const userId = req.user.id;

    const [conversation] = await db
      .insert(conversations)
      .values({
        userId,
      })
      .returning();

    try {
      await summaryUpdateQueue.add(
        'periodic',
        { conversationId: conversation.id },
        {
          repeat: {
            every: 3 * 60 * 1000,
          },
          jobId: `summary-periodic-${conversation.id}`, 
        }
      );
    } catch (error) {
      console.error('Error scheduling periodic summary job:', error);
    }

    return res.status(201).json({
      id: conversation.id,
      createdAt: conversation.createdAt,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

