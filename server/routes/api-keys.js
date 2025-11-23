import { db } from '../config/db.js';
import { apiKeys } from '../config/schema.js';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

const hashApiKey = (apiKey) => {
  return crypto.pbkdf2Sync(apiKey, 'salt', 10000, 64, 'sha512').toString('hex');
};

const generateApiKey = () => {
  const randomBytes = crypto.randomBytes(32);
  return `sk_${randomBytes.toString('hex')}`;
};

export const getApiKeysRoute = async (req, res) => {
  try {
    const userId = req.user.id;

    const userApiKeys = await db
      .select({
        id: apiKeys.id,
        keyPrefix: apiKeys.keyPrefix,
        name: apiKeys.name,
        isActive: apiKeys.isActive,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));

    return res.status(200).json(userApiKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createApiKeyRoute = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 12);

    const [newApiKey] = await db
      .insert(apiKeys)
      .values({
        userId,
        keyHash,
        keyPrefix,
        name: name || 'My API Key',
      })
      .returning();

    return res.status(201).json({
      id: newApiKey.id,
      key: apiKey,
      keyPrefix: newApiKey.keyPrefix,
      name: newApiKey.name,
      createdAt: newApiKey.createdAt,
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

