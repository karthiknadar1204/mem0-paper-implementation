import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { apiKeys } from '../config/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const hashApiKey = (apiKey) => {
  return crypto.pbkdf2Sync(apiKey, 'salt', 10000, 64, 'sha512').toString('hex');
};

const verifyApiKey = async (apiKey) => {
  try {
    const keyHash = hashApiKey(apiKey);
    
    const [keyRecord] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash))
      .limit(1);

    if (!keyRecord || !keyRecord.isActive) {
      return null;
    }

    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, keyRecord.id));

    return {
      id: keyRecord.userId,
      apiKeyId: keyRecord.id,
    };
  } catch (error) {
    console.error('Error verifying API key:', error);
    return null;
  }
};

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const apiKey = authHeader.substring(7);
      
      if (apiKey && apiKey.startsWith('sk_')) {
        const user = await verifyApiKey(apiKey);
        
        if (user) {
          req.user = {
            id: user.id,
            apiKeyId: user.apiKeyId,
          };
          return next();
        }
      }
    }

    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );

    req.user = {
      id: decoded.id,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

