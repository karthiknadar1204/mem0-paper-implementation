import { db } from '../config/db.js';
import { conversations } from '../config/schema.js';
import { summaryUpdateQueue } from '../config/queue.js';
import { eq, desc } from 'drizzle-orm';

export const getConversationsRoute = async (req, res) => {
  try {
    const userId = req.user.id;

    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));

    return res.status(200).json(userConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createConversationRoute = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    const [conversation] = await db
      .insert(conversations)
      .values({
        userId,
        name: name || null,
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
      name: conversation.name,
      createdAt: conversation.createdAt,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

