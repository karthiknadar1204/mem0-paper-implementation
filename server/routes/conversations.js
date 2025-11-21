import { db } from '../config/db.js';
import { conversations } from '../config/schema.js';

export const createConversationRoute = async (req, res) => {
  try {
    const [conversation] = await db
      .insert(conversations)
      .values({})
      .returning();

    return res.status(201).json({
      id: conversation.id,
      createdAt: conversation.createdAt,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

