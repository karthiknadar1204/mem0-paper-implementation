import { pgTable, uuid, text, timestamp, varchar } from 'drizzle-orm/pg-core';

//Groups everything together. One row = one long-term chat with the AI. Without it we cannot separate memories of different chats.
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// raw chat history
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

//Every extracted fact lives here forever (or until deleted/updated). This is the table Pinecone points to.
export const memories = pgTable('memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

//Stores the short global conversation summary (≤400 tokens). Used in every extraction prompt so the LLM knows the big picture and doesn’t re-extract old facts.
export const summaries = pgTable('summaries', {
  conversationId: uuid('conversation_id')
    .primaryKey()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  text: text('text').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});