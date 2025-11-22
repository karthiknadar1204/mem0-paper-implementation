import { db } from '../config/db.js';
import { apiKeys } from '../config/schema.js';
import crypto from 'crypto';

const hashApiKey = (apiKey) => {
  return crypto.pbkdf2Sync(apiKey, 'salt', 10000, 64, 'sha512').toString('hex');
};

const generateApiKey = () => {
  const randomBytes = crypto.randomBytes(32);
  return `sk_${randomBytes.toString('hex')}`;
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

