# How the Memory Layer Works: A Simple Walkthrough

This blog explains how our memory layer processes messages, stores information, and retrieves memories when users ask questions. We'll walk through each step in simple terms.

---

## Architecture Overview: Synchronous vs Asynchronous

Before diving into details, it's important to understand the architecture:

**Synchronous (User-facing):**
- `chat()` - User gets immediate reply
- `ask()` - User gets immediate answer
- Messages are stored immediately

**Asynchronous (Background Workers):**
- Memory extraction from messages (Memory Processor Worker)
- Summary generation and updates (Summary Processor Worker)
- API request and retrieval logging (Logging Processor Worker)
- All happen in background workers using BullMQ/Redis queues

This design ensures users get instant responses while memory processing happens in the background.

---

## Overview: What Gets Stored Where?

Before diving into the flow, here's a quick overview of what's stored:

1. **Messages Table**: All chat messages (user and assistant) are stored here
2. **Memories Table**: Extracted facts from conversations live here forever (or until updated/deleted)
3. **Summaries Table**: A short summary (≤400 tokens) of the entire conversation
4. **Pinecone**: Vector embeddings of all memories for fast similarity search

---

## Part 1: When a User Sends a Message (chat/say method)

Let's walk through what happens when a user calls `memory.chat("Hi, I'm Alex. I became vegan last month.")`.

### Step 1: Message Arrives at Backend

The SDK sends a POST request to `/conversations/{conversationId}/chat` with:
- The message text
- LLM provider settings (OpenAI/Gemini)

### Step 2: Store the User Message

```javascript
// Message is immediately saved to the database
{
  conversationId: "...",
  role: "user",
  content: "Hi, I'm Alex. I became vegan last month."
}
```

This message is stored in the `messages` table.

### Step 3: Generate Assistant Reply

The system:
1. Fetches the conversation summary (if it exists)[S]
2. Gets the last 20 messages for context [mt]
3. Builds a prompt with:
   - Previous conversation summary[S]
   - Recent message history[p]
   - The new user message[mt-1,m]
4. Makes an LLM call to generate a reply using your chosen provider (OpenAI/Gemini)
5. Stores the assistant's reply in the `messages` table

**LLM Call Made:**
- Model: Your specified model (e.g., gpt-4o-mini)
- Purpose: Generate conversational reply
- Temperature: 0.7 (creative)

### Step 4: Queue Memory Processing (Background)

After storing both messages, the system queues a background job in the `memory-process` queue (using BullMQ/Redis) to extract and store memories from the user's message. This happens asynchronously so the user gets an instant reply.

**Queue System:**
- Uses BullMQ with Redis for job queuing
- Job is processed by a background worker (separate from API server)
- Multiple memory extraction jobs can run concurrently (up to 5 at once)

---

## Part 2: Memory Extraction (Background Process) - Deep Dive

Now let's see what happens in that background job that processes the user's message. This runs in a separate worker process that continuously listens to the `memory-process` queue.

### Worker Configuration

- **Queue Name**: `memory-process`
- **Concurrency**: 5 jobs processed simultaneously
- **Job Retention**: Completed jobs kept for 1 hour, failed jobs for 24 hours
- **Connection**: Uses Redis (BullMQ) for job queue

### Step 1: Worker Receives Job

When a job arrives in the queue, it contains:
```javascript
{
  conversationId: "uuid-here",
  messageId: "uuid-here"
}
```

### Step 2: Fetch Context from Database

The worker performs **4 database queries** to gather all necessary context:

#### Query 1: Fetch the New Message
```sql
SELECT * FROM messages 
WHERE id = $messageId 
LIMIT 1
```
**Purpose**: Get the exact message that needs processing and verify it exists
**Returns**: Single message object with `id`, `conversationId`, `role`, `content`, `createdAt`
**Early Exit**: If message not found, worker returns immediately (no further processing)

#### Query 2: Fetch ALL Messages for Conversation (to find previous)
```sql
SELECT * FROM messages 
WHERE conversation_id = $conversationId 
ORDER BY created_at ASC
```
**Purpose**: Get ALL messages in chronological order to find which one came immediately before the new message
**Returns**: Array of ALL messages for the conversation, sorted by creation time (oldest first)
**Logic**: 
1. Worker gets all messages as an array
2. Finds the index of the current message: `allMessages.findIndex(msg => msg.id === messageId)`
3. Gets previous message: `allMessages[currentIndex - 1]` (if index > 0)
4. If index is 0 (first message), previous message is `null`

**Why This Approach?**
The current implementation fetches all messages to find the previous one. This could be optimized to a single query:
```sql
-- More efficient alternative (not currently used):
SELECT * FROM messages 
WHERE conversation_id = $conversationId 
  AND created_at < (SELECT created_at FROM messages WHERE id = $messageId)
ORDER BY created_at DESC 
LIMIT 1
```
However, the current code uses the "fetch all, find in JavaScript" approach, which works but is less efficient for conversations with many messages.

#### Query 3: Fetch Current Summary
```sql
SELECT * FROM summaries 
WHERE conversation_id = $conversationId 
LIMIT 1
```
**Purpose**: Get the conversation summary to prevent re-extracting known facts
**Returns**: Summary object with `conversationId`, `text`, `updatedAt`
**Fallback**: If no summary exists, uses empty string `''`

#### Query 4: Fetch Recent Messages (Last 10)
```sql
SELECT * FROM messages 
WHERE conversation_id = $conversationId 
ORDER BY created_at DESC 
LIMIT 10
```
**Purpose**: Get recent conversation context
**Returns**: Array of 10 most recent messages (then reversed to chronological order)
**Note**: Excludes the new message being processed

**Context Object Assembled:**
```javascript
{
  newMessage: { id, conversationId, role, content, createdAt },
  previousMessage: { id, conversationId, role, content, createdAt } | null,
  summary: "string or empty",
  recentMessages: [array of 10 messages]
}
```

### Step 3: Extract Facts with LLM

**LLM Call #1: Fact Extraction**

**API Call:**
```javascript
openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: 'You are a fact extraction system. Extract ONLY new facts from the NEW message provided. Do NOT re-extract facts that already exist in the conversation summary or recent messages. Focus strictly on what is NEW in the latest message. Return a JSON object with a "facts" array of strings.'
    },
    {
      role: 'user',
      content: buildExtractionPrompt(summary, recentMessages, previousMessage, newMessage)
    }
  ],
  temperature: 0.2,
  response_format: { type: 'json_object' }
})
```

**Prompt Structure:**
The `buildExtractionPrompt` function creates a prompt with:
1. Conversation summary (for context - tells LLM what's already known)
2. Recent messages (last 10, for context - tells LLM what was recently discussed)
3. Previous message (if exists) + NEW message (the one to extract from)
4. Instructions to extract ONLY new facts, not duplicates

**Example Prompt:**
```
Conversation summary (for context only - do not extract from this):
Alex is a vegan who became vegan last month. Alex lives in Berlin.

Recent conversation history (for context only - do not extract from these):
user: Hi, I'm Alex. I became vegan last month.
assistant: That's great!

IMPORTANT: Extract ONLY new, important facts stated in the NEW message below.

Previous message: user: Hi, I'm Alex. I became vegan last month.

NEW message to extract from: user: I stopped being vegan and I'm non-veg now

Extract facts that are:
1. Stated explicitly in the NEW message above
2. Not already covered in the summary or recent messages
3. Important and factual (not conversational filler)

Return a JSON object with a "facts" array containing fact strings.
```

**Response Processing:**
```javascript
const content = response.choices[0].message.content;  // JSON string
const parsed = JSON.parse(content);  // { facts: ["...", "..."] }
const facts = parsed.facts || [];  // Array of fact strings
// Filter out empty strings
return facts.filter(fact => typeof fact === 'string' && fact.trim().length > 0);
```

**Example Output:**
```json
{
  "facts": [
    "User stopped being vegan",
    "User is now non-vegetarian"
  ]
}
```

**Early Exit**: If no facts extracted, worker returns immediately (no further processing).

### Step 4: Process Each Fact (Loop)

For each extracted fact, the worker calls `processFact(fact, conversationId)`. This is where the real magic happens.

#### 4a. Create Embedding for Fact

**LLM Call #2 (per fact): Embedding Generation**

**API Call:**
```javascript
openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: fact  // e.g., "User stopped being vegan"
})
```

**Response:**
```javascript
{
  data: [{
    embedding: [0.123, -0.456, ..., 0.789]  // 1536-dimensional vector
  }]
}
```

**Vector Details:**
- **Dimensions**: 1536
- **Model**: `text-embedding-3-small` (OpenAI's embedding model)
- **Purpose**: Convert text to numerical representation for similarity search

#### 4b. Query Database for Conversation Memories

**Database Query:**
```sql
SELECT id FROM memories 
WHERE conversation_id = $conversationId
```
**Purpose**: Get list of all memory IDs for this conversation
**Returns**: Array of objects like `[{ id: "uuid-1" }, { id: "uuid-2" }, ...]`
**Why**: Needed to filter Pinecone results to only this conversation's memories

#### 4c. Search Pinecone for Similar Memories

**Pinecone Query (with filter - preferred method):**
```javascript
index.query({
  vector: embedding,  // 1536-dimensional array
  topK: Math.min(10, conversationMemories.length),  // Max 10 results
  includeMetadata: true,  // Get metadata with results
  filter: {
    conversationId: { $eq: conversationId }  // Only this conversation
  }
})
```

**If filter fails (fallback method):**
```javascript
index.query({
  vector: embedding,
  topK: Math.min(10, conversationMemories.length),
  includeMetadata: true
  // No filter - will filter in code instead
})
```

**Response Processing:**
```javascript
{
  matches: [
    {
      id: "memory-uuid-1",
      score: 0.87,  // Cosine similarity (0-1, higher = more similar)
      metadata: {
        conversationId: "...",
        content: "User became vegan last month"
      }
    },
    {
      id: "memory-uuid-2",
      score: 0.65,
      metadata: { ... }
    }
  ]
}
```

**Filtering Logic:**
1. Only keep matches with `score >= 0.5` (SIMILARITY_THRESHOLD)
2. For each match, verify it belongs to this conversation
3. Fetch full memory details from database

**Database Query (per similar memory):**
```sql
SELECT * FROM memories 
WHERE id = $matchId 
LIMIT 1
```

**Similar Memories Array Built:**
```javascript
[
  {
    id: "memory-uuid-1",
    content: "User became vegan last month",
    score: 0.87
  }
]
```

#### 4d. Decide Action with LLM Tool Calling

**LLM Call #3 (per fact): Action Decision**

**API Call:**
```javascript
openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: 'You are a memory management system. Decide whether to ADD, UPDATE, or DELETE a memory based on the candidate fact and existing similar memories.'
    },
    {
      role: 'user',
      content: buildToolCallingPrompt(fact, similarMemories)
    }
  ],
  temperature: 0.2,
  tools: [
    {
      type: 'function',
      function: {
        name: 'decide_memory_action',
        description: 'Decide what action to take on a memory: ADD (new fact), UPDATE (refines existing), or DELETE (contradicts existing)',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['ADD', 'UPDATE', 'DELETE'],
              description: 'The action to take'
            },
            memoryId: {
              type: 'string',
              description: 'The ID of the existing memory (required for UPDATE and DELETE, null for ADD)'
            }
          },
          required: ['action']
        }
      }
    }
  ],
  tool_choice: { type: 'function', function: { name: 'decide_memory_action' } }
})
```

**Prompt Structure:**
```
Candidate fact: "User stopped being vegan"

Existing similar memories:
1. Memory ID: memory-uuid-1, Content: "User became vegan last month"

Decide what action to take:
- ADD: This is a completely new fact (no similar memory exists or this adds new information)
- UPDATE: This fact updates/refines an existing memory (use the memoryId of the most similar one)
- DELETE: This fact contradicts an existing memory (use the memoryId of the contradicted one)

Return your decision as a JSON object: { "action": "ADD" | "UPDATE" | "DELETE", "memoryId": "uuid" (only for UPDATE/DELETE) }
```

**Response Processing:**
```javascript
const toolCall = response.choices[0].message.tool_calls?.[0];
if (!toolCall || toolCall.function.name !== 'decide_memory_action') {
  // Fallback: default to ADD
  return { action: 'ADD', memoryId: null };
}

const parsed = JSON.parse(toolCall.function.arguments);
// { action: 'UPDATE', memoryId: 'memory-uuid-1' }
```

**Decision Examples:**
- Fact: "User stopped being vegan" + Similar: "User became vegan last month" → **UPDATE** (contradicts/updates)
- Fact: "User's name is Alex" + No similar → **ADD** (new fact)
- Fact: "User is not vegan" + Similar: "User is vegan" → **DELETE** (contradicts)

#### 4e. Execute the Action

The `executeAction` function performs the actual database and vector operations:

##### Action: ADD

**Step 1: Insert into Database**
```sql
INSERT INTO memories (conversation_id, content, created_at, updated_at)
VALUES ($conversationId, $fact, NOW(), NOW())
RETURNING *
```
**Returns**: New memory object with `id`, `conversationId`, `content`, `createdAt`, `updatedAt`

**Step 2: Upsert into Pinecone**
```javascript
index.upsert([
  {
    id: newMemory.id,  // UUID from database
    values: embedding,  // 1536-dimensional vector
    metadata: {
      conversationId: conversationId,
      content: fact
    }
  }
])
```
**Purpose**: Store the embedding for future similarity searches
**Note**: `upsert` creates if doesn't exist, updates if it does

**Result**: `{ action: 'ADD', memoryId: newMemory.id }`

##### Action: UPDATE

**Step 1: Fetch Old Memory**
```sql
SELECT * FROM memories 
WHERE id = $memoryId 
LIMIT 1
```
**Purpose**: Get old content for logging/comparison

**Step 2: Update Database**
```sql
UPDATE memories 
SET content = $fact, updated_at = NOW()
WHERE id = $memoryId
```
**Changes**: Updates `content` and `updatedAt` fields
**Note**: `createdAt` remains unchanged (preserves original creation time)

**Step 3: Update Pinecone**
```javascript
index.upsert([
  {
    id: memoryId,  // Same ID
    values: embedding,  // NEW embedding (for updated content)
    metadata: {
      conversationId: conversationId,
      content: fact  // NEW content
    }
  }
])
```
**Purpose**: Update the vector embedding to match new content
**Note**: Same ID, but new vector and metadata

**Result**: `{ action: 'UPDATE', memoryId, oldContent: "...", newContent: "..." }`

##### Action: DELETE

**Step 1: Delete from Database**
```sql
DELETE FROM memories 
WHERE id = $memoryId
```
**Purpose**: Remove memory from PostgreSQL
**Cascade**: If there are foreign key relationships, they're handled by database constraints

**Step 2: Delete from Pinecone**
```javascript
index.deleteMany([memoryId])
```
**Purpose**: Remove embedding from vector database
**Note**: Must delete from both databases to keep them in sync

**Result**: `{ action: 'DELETE', memoryId }`

### Step 5: Track Results and Trigger Summary Update

After processing all facts, the worker:

1. **Counts Actions:**
   - `memoriesAdded`: Count of ADD actions
   - `memoriesUpdated`: Count of UPDATE actions

2. **Checks Threshold:**
   ```javascript
   if (memoriesAdded >= 3 || memoriesUpdated >= 2) {
     // Queue summary update
   }
   ```

3. **Queues Summary Update (if threshold met):**
   ```javascript
   summaryUpdateQueue.add(
     'update',
     { conversationId },
     {
       delay: 5000,  // 5 second delay
       jobId: `summary-${conversationId}-${Date.now()}`
     }
   )
   ```
   **Purpose**: Batch multiple memory changes before updating summary
   **Delay**: 5 seconds allows multiple memory jobs to complete first
   **Job ID**: Unique ID to prevent duplicate jobs

### Complete Flow Example

**Input Message**: "I stopped being vegan, I'm non-veg now"

**Step-by-Step:**

1. **Fetch Context** (4 DB queries)
   - Get message
   - Get all messages (find previous)
   - Get summary
   - Get recent 10 messages

2. **Extract Facts** (1 LLM call)
   - Facts: ["User stopped being vegan", "User is now non-vegetarian"]

3. **Process Fact 1: "User stopped being vegan"**
   - Create embedding (1 LLM call)
   - Query DB for conversation memories (1 DB query)
   - Search Pinecone (1 vector query)
   - Find similar: "User became vegan last month" (score: 0.85)
   - Fetch memory details (1 DB query)
   - Decide action (1 LLM call with tool calling) → **UPDATE**
   - Execute: Update DB (1 UPDATE query), Update Pinecone (1 upsert)

4. **Process Fact 2: "User is now non-vegetarian"**
   - Create embedding (1 LLM call)
   - Query DB for conversation memories (1 DB query)
   - Search Pinecone (1 vector query)
   - Find similar: "User stopped being vegan" (score: 0.92) - just added!
   - Fetch memory details (1 DB query)
   - Decide action (1 LLM call with tool calling) → **UPDATE**
   - Execute: Update DB (1 UPDATE query), Update Pinecone (1 upsert)

5. **Summary Update**
   - 2 updates >= 2 threshold → Queue summary update job

**Total Operations for this example:**
- **Database Queries**: ~12 (context fetching + per-fact operations)
- **LLM Calls**: 5 (1 extraction + 2 embeddings + 2 decisions)
- **Vector Operations**: 2 (Pinecone queries + 2 upserts)
- **Queue Operations**: 1 (summary update job)

---

### Real-World Example: Contradiction/Update Scenario

Let's walk through a concrete example: **User says "I am a vegetarian" but the system already knows "User is a vegan"**.

**Initial State:**
- **Database**: Memory with ID `memory-abc-123`, content: "User is a vegan"
- **Pinecone**: Vector embedding for "User is a vegan" stored with ID `memory-abc-123`

**User Message**: "I am a vegetarian"

#### Step 1: Extract Facts

**LLM Call (Fact Extraction):**
```
Input: "I am a vegetarian"
Output: { "facts": ["User is a vegetarian"] }
```

**Extracted Fact**: `"User is a vegetarian"`

#### Step 2: Create Embedding for New Fact

**LLM Call (Embedding):**
```javascript
openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: "User is a vegetarian"
})
```

**Result**: 1536-dimensional vector `[0.123, -0.456, ..., 0.789]`

#### Step 3: Search Pinecone for Similar Memories

**Pinecone Query:**
```javascript
index.query({
  vector: [0.123, -0.456, ..., 0.789],  // "User is a vegetarian" embedding
  topK: 10,
  includeMetadata: true,
  filter: { conversationId: { $eq: conversationId } }
})
```

**Pinecone Response:**
```javascript
{
  matches: [
    {
      id: "memory-abc-123",
      score: 0.82,  // High similarity! (vegan and vegetarian are semantically similar)
      metadata: {
        conversationId: "...",
        content: "User is a vegan"
      }
    }
  ]
}
```

**Why High Similarity?**
- "vegan" and "vegetarian" are semantically similar concepts
- Embeddings capture meaning, not exact words
- Score 0.82 > 0.5 threshold → considered similar

#### Step 4: Fetch Full Memory Details

**Database Query:**
```sql
SELECT * FROM memories 
WHERE id = 'memory-abc-123' 
LIMIT 1
```

**Result:**
```javascript
{
  id: "memory-abc-123",
  conversationId: "...",
  content: "User is a vegan",
  createdAt: "2024-01-10T10:00:00Z",
  updatedAt: "2024-01-10T10:00:00Z"
}
```

**Similar Memories Array:**
```javascript
[
  {
    id: "memory-abc-123",
    content: "User is a vegan",
    score: 0.82
  }
]
```

#### Step 5: LLM Decides Action (Tool Calling)

**LLM Call (Decision):**
```javascript
openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: 'You are a memory management system. Decide whether to ADD, UPDATE, or DELETE a memory based on the candidate fact and existing similar memories.'
    },
    {
      role: 'user',
      content: `Candidate fact: "User is a vegetarian"

Existing similar memories:
1. Memory ID: memory-abc-123, Content: "User is a vegan"

Decide what action to take:
- ADD: This is a completely new fact (no similar memory exists or this adds new information)
- UPDATE: This fact updates/refines an existing memory (use the memoryId of the most similar one)
- DELETE: This fact contradicts an existing memory (use the memoryId of the contradicted one)

Return your decision as a JSON object: { "action": "ADD" | "UPDATE" | "DELETE", "memoryId": "uuid" (only for UPDATE/DELETE) }`
    }
  ],
  temperature: 0.2,
  tools: [/* tool calling schema */],
  tool_choice: { type: 'function', function: { name: 'decide_memory_action' } }
})
```

**LLM Reasoning:**
- "User is a vegetarian" vs "User is a vegan"
- These are related but different dietary preferences
- The new fact **contradicts/updates** the existing one (user changed from vegan to vegetarian, or was mistaken about being vegan)
- Decision: **UPDATE** (refines the existing memory with more accurate information)

**LLM Response:**
```javascript
{
  tool_calls: [{
    function: {
      name: "decide_memory_action",
      arguments: '{"action": "UPDATE", "memoryId": "memory-abc-123"}'
    }
  }]
}
```

**Parsed Decision:**
```javascript
{
  action: "UPDATE",
  memoryId: "memory-abc-123"
}
```

#### Step 6: Execute UPDATE Action

**Step 6a: Fetch Old Memory (for logging)**
```sql
SELECT * FROM memories 
WHERE id = 'memory-abc-123' 
LIMIT 1
```

**Old Content**: `"User is a vegan"`

**Step 6b: Update Database**
```sql
UPDATE memories 
SET content = 'User is a vegetarian', updated_at = NOW()
WHERE id = 'memory-abc-123'
```

**Database Changes:**
- `content`: `"User is a vegan"` → `"User is a vegetarian"`
- `updatedAt`: `"2024-01-10T10:00:00Z"` → `"2024-01-15T14:30:00Z"` (current timestamp)
- `createdAt`: **Unchanged** (still `"2024-01-10T10:00:00Z"` - preserves original creation time)
- `id`: **Unchanged** (same memory, just updated)

**Step 6c: Update Pinecone**
```javascript
index.upsert([
  {
    id: "memory-abc-123",  // SAME ID
    values: [0.123, -0.456, ..., 0.789],  // NEW embedding (for "vegetarian")
    metadata: {
      conversationId: conversationId,
      content: "User is a vegetarian"  // NEW content
    }
  }
])
```

**Pinecone Changes:**
- **ID**: Same (`memory-abc-123`) - this is key! Same memory, updated
- **Vector**: New embedding (for "vegetarian" instead of "vegan")
- **Metadata**: Updated content

**Why Update Both?**
- **Database**: Stores the actual text content
- **Pinecone**: Stores the vector embedding for similarity search
- Both must be updated to stay in sync

#### Step 7: Result

**Return Value:**
```javascript
{
  action: "UPDATE",
  memoryId: "memory-abc-123",
  oldContent: "User is a vegan",
  newContent: "User is a vegetarian"
}
```

**Final State:**
- **Database**: Memory `memory-abc-123` now contains `"User is a vegetarian"` with updated timestamp
- **Pinecone**: Vector for `memory-abc-123` now represents "vegetarian" instead of "vegan"
- **Memory ID**: **Unchanged** - it's the same memory, just updated

#### Key Insights

1. **Same Memory ID**: The memory keeps the same UUID - it's an update, not a new memory
2. **Both Databases Updated**: PostgreSQL (text) and Pinecone (vector) are both updated
3. **Timestamp Tracking**: `updatedAt` changes, `createdAt` stays the same
4. **Semantic Similarity**: "vegan" and "vegetarian" have high embedding similarity (0.82), so the system recognizes they're related
5. **LLM Decision**: The LLM understands that "vegetarian" contradicts/refines "vegan" and chooses UPDATE
6. **No Duplicate**: The system doesn't create a new memory - it updates the existing one, preventing duplicates

---

### Real-World Example: ADD Operation (New Fact)

Let's walk through a concrete example: **User says "I live in Berlin" and the system has no similar memories**.

**Initial State:**
- **Database**: No memories about location
- **Pinecone**: No location-related vectors

**User Message**: "I live in Berlin"

#### Step 1: Extract Facts

**LLM Call (Fact Extraction):**
```
Input: "I live in Berlin"
Output: { "facts": ["User lives in Berlin"] }
```

**Extracted Fact**: `"User lives in Berlin"`

#### Step 2: Create Embedding for New Fact

**LLM Call (Embedding):**
```javascript
openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: "User lives in Berlin"
})
```

**Result**: 1536-dimensional vector `[0.234, -0.567, ..., 0.891]`

#### Step 3: Search Pinecone for Similar Memories

**Pinecone Query:**
```javascript
index.query({
  vector: [0.234, -0.567, ..., 0.891],  // "User lives in Berlin" embedding
  topK: 10,
  includeMetadata: true,
  filter: { conversationId: { $eq: conversationId } }
})
```

**Pinecone Response:**
```javascript
{
  matches: [
    {
      id: "memory-xyz-789",
      score: 0.35,  // Low similarity (about something else entirely)
      metadata: {
        conversationId: "...",
        content: "User likes pizza"
      }
    }
  ]
}
```

**Why No Similar Memories?**
- Score 0.35 < 0.5 threshold → **not considered similar**
- "User lives in Berlin" and "User likes pizza" are completely different topics
- No location-related memories exist

**Similar Memories Array:**
```javascript
[]  // Empty - no similar memories found
```

#### Step 4: LLM Decides Action (Tool Calling)

**LLM Call (Decision):**
```javascript
openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: 'You are a memory management system. Decide whether to ADD, UPDATE, or DELETE a memory based on the candidate fact and existing similar memories.'
    },
    {
      role: 'user',
      content: `Candidate fact: "User lives in Berlin"

No similar memories found. This is a new fact.

Return your decision as a JSON object: { "action": "ADD", "memoryId": null }`
    }
  ],
  temperature: 0.2,
  tools: [/* tool calling schema */],
  tool_choice: { type: 'function', function: { name: 'decide_memory_action' } }
})
```

**LLM Reasoning:**
- No similar memories found (empty array)
- This is a completely new fact
- Decision: **ADD** (create new memory)

**LLM Response:**
```javascript
{
  tool_calls: [{
    function: {
      name: "decide_memory_action",
      arguments: '{"action": "ADD", "memoryId": null}'
    }
  }]
}
```

**Parsed Decision:**
```javascript
{
  action: "ADD",
  memoryId: null  // No existing memory to reference
}
```

#### Step 5: Execute ADD Action

**Step 5a: Insert into Database**
```sql
INSERT INTO memories (conversation_id, content, created_at, updated_at)
VALUES ($conversationId, 'User lives in Berlin', NOW(), NOW())
RETURNING *
```

**Database Result:**
```javascript
{
  id: "memory-new-456",  // NEW UUID generated by database
  conversationId: "...",
  content: "User lives in Berlin",
  createdAt: "2024-01-15T14:30:00Z",
  updatedAt: "2024-01-15T14:30:00Z"
}
```

**Database Changes:**
- **New row created** with auto-generated UUID
- `content`: `"User lives in Berlin"`
- `createdAt` and `updatedAt`: Both set to current time (same for new memories)
- `conversationId`: Links to the conversation

**Step 5b: Insert into Pinecone**
```javascript
index.upsert([
  {
    id: "memory-new-456",  // SAME UUID from database
    values: [0.234, -0.567, ..., 0.891],  // Embedding for "User lives in Berlin"
    metadata: {
      conversationId: conversationId,
      content: "User lives in Berlin"
    }
  }
])
```

**Pinecone Changes:**
- **New vector created** with the same UUID as database
- Vector embedding stored for future similarity searches
- Metadata includes conversation ID and content

**Why Both Databases?**
- **Database**: Stores the actual text content
- **Pinecone**: Stores the vector embedding for similarity search
- Both must be created to keep them in sync

#### Step 6: Result

**Return Value:**
```javascript
{
  action: "ADD",
  memoryId: "memory-new-456"
}
```

**Final State:**
- **Database**: New memory `memory-new-456` with content `"User lives in Berlin"`
- **Pinecone**: New vector `memory-new-456` with embedding for "User lives in Berlin"
- **Memory ID**: **New UUID** - this is a brand new memory

#### Key Insights

1. **New Memory ID**: A new UUID is generated - this is a completely new memory
2. **Both Databases Created**: PostgreSQL (text) and Pinecone (vector) both get new entries
3. **Same UUID**: The memory ID is the same in both databases (critical for syncing)
4. **No Similar Memories**: When no similar memories exist, ADD is the only logical choice
5. **Future Searches**: This new memory will now appear in future similarity searches

---

### Real-World Example: DELETE Operation (Contradiction)

Let's walk through a concrete example: **User says "I don't have a girlfriend" but the system knows "User's girlfriend is Sarah"**.

**Initial State:**
- **Database**: Memory with ID `memory-relationship-789`, content: "User's girlfriend is Sarah"
- **Pinecone**: Vector embedding for "User's girlfriend is Sarah" stored with ID `memory-relationship-789`

**User Message**: "I don't have a girlfriend anymore, we broke up"

#### Step 1: Extract Facts

**LLM Call (Fact Extraction):**
```
Input: "I don't have a girlfriend anymore, we broke up"
Output: { "facts": ["User does not have a girlfriend", "User broke up with their girlfriend"] }
```

**Extracted Fact**: `"User does not have a girlfriend"` (processing first fact)

#### Step 2: Create Embedding for New Fact

**LLM Call (Embedding):**
```javascript
openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: "User does not have a girlfriend"
})
```

**Result**: 1536-dimensional vector `[0.345, -0.678, ..., 0.912]`

#### Step 3: Search Pinecone for Similar Memories

**Pinecone Query:**
```javascript
index.query({
  vector: [0.345, -0.678, ..., 0.912],  // "User does not have a girlfriend" embedding
  topK: 10,
  includeMetadata: true,
  filter: { conversationId: { $eq: conversationId } }
})
```

**Pinecone Response:**
```javascript
{
  matches: [
    {
      id: "memory-relationship-789",
      score: 0.78,  // High similarity! (both about girlfriend status)
      metadata: {
        conversationId: "...",
        content: "User's girlfriend is Sarah"
      }
    }
  ]
}
```

**Why High Similarity?**
- Both facts are about girlfriend status
- Embeddings capture semantic meaning (relationship context)
- Score 0.78 > 0.5 threshold → considered similar

#### Step 4: Fetch Full Memory Details

**Database Query:**
```sql
SELECT * FROM memories 
WHERE id = 'memory-relationship-789' 
LIMIT 1
```

**Result:**
```javascript
{
  id: "memory-relationship-789",
  conversationId: "...",
  content: "User's girlfriend is Sarah",
  createdAt: "2024-01-05T09:00:00Z",
  updatedAt: "2024-01-05T09:00:00Z"
}
```

**Similar Memories Array:**
```javascript
[
  {
    id: "memory-relationship-789",
    content: "User's girlfriend is Sarah",
    score: 0.78
  }
]
```

#### Step 5: LLM Decides Action (Tool Calling)

**LLM Call (Decision):**
```javascript
openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: 'You are a memory management system. Decide whether to ADD, UPDATE, or DELETE a memory based on the candidate fact and existing similar memories.'
    },
    {
      role: 'user',
      content: `Candidate fact: "User does not have a girlfriend"

Existing similar memories:
1. Memory ID: memory-relationship-789, Content: "User's girlfriend is Sarah"

Decide what action to take:
- ADD: This is a completely new fact (no similar memory exists or this adds new information)
- UPDATE: This fact updates/refines an existing memory (use the memoryId of the most similar one)
- DELETE: This fact contradicts an existing memory (use the memoryId of the contradicted one)

Return your decision as a JSON object: { "action": "ADD" | "UPDATE" | "DELETE", "memoryId": "uuid" (only for UPDATE/DELETE) }`
    }
  ],
  temperature: 0.2,
  tools: [/* tool calling schema */],
  tool_choice: { type: 'function', function: { name: 'decide_memory_action' } }
})
```

**LLM Reasoning:**
- "User does not have a girlfriend" vs "User's girlfriend is Sarah"
- These are **direct contradictions** - you can't have a girlfriend and not have one
- The new fact **completely contradicts** the existing one
- Decision: **DELETE** (remove the contradicted memory entirely)

**LLM Response:**
```javascript
{
  tool_calls: [{
    function: {
      name: "decide_memory_action",
      arguments: '{"action": "DELETE", "memoryId": "memory-relationship-789"}'
    }
  }]
}
```

**Parsed Decision:**
```javascript
{
  action: "DELETE",
  memoryId: "memory-relationship-789"
}
```

#### Step 6: Execute DELETE Action

**Step 6a: Delete from Database**
```sql
DELETE FROM memories 
WHERE id = 'memory-relationship-789'
```

**Database Changes:**
- **Row completely removed** from `memories` table
- No trace left in PostgreSQL (unless there are foreign key relationships)
- Cascade deletes: If other tables reference this memory, they're handled by database constraints

**Step 6b: Delete from Pinecone**
```javascript
index.deleteMany(['memory-relationship-789'])
```

**Pinecone Changes:**
- **Vector completely removed** from Pinecone index
- No trace left in vector database
- Future similarity searches won't find this memory

**Why Delete Both?**
- **Database**: Removes the text content
- **Pinecone**: Removes the vector embedding
- Both must be deleted to keep them in sync and prevent orphaned data

#### Step 7: Result

**Return Value:**
```javascript
{
  action: "DELETE",
  memoryId: "memory-relationship-789"
}
```

**Final State:**
- **Database**: Memory `memory-relationship-789` **no longer exists**
- **Pinecone**: Vector `memory-relationship-789` **no longer exists**
- **Memory ID**: **Completely removed** - the memory is gone

#### Key Insights

1. **Complete Removal**: The memory is deleted from both databases - no trace remains
2. **Both Databases Deleted**: PostgreSQL (text) and Pinecone (vector) both remove the entry
3. **Direct Contradiction**: DELETE is used when facts directly contradict each other
4. **No Update**: Unlike UPDATE, DELETE doesn't preserve the old content - it's gone
5. **Future Searches**: This memory will never appear in future similarity searches

#### What About the Second Fact?

Remember, the extraction returned **two facts**:
1. `"User does not have a girlfriend"` → **DELETE** (removed old memory)
2. `"User broke up with their girlfriend"` → Would be processed separately

The second fact might:
- **ADD**: Create a new memory about the breakup (if no similar memory exists)
- **UPDATE**: Update an existing memory about relationships (if one exists)

This shows how the system handles multiple facts from one message - each is processed independently.

---

### Comparison: ADD vs UPDATE vs DELETE

| Operation | When Used | Memory ID | Database Action | Pinecone Action |
|-----------|-----------|-----------|-----------------|-----------------|
| **ADD** | No similar memories found | **New UUID** generated | `INSERT` new row | `upsert` new vector |
| **UPDATE** | Fact refines/contradicts existing | **Same UUID** (existing) | `UPDATE` existing row | `upsert` same ID with new vector |
| **DELETE** | Fact directly contradicts existing | **Same UUID** (existing) | `DELETE` row | `deleteMany` same ID |

**Key Differences:**
- **ADD**: Creates new memory (new UUID)
- **UPDATE**: Modifies existing memory (same UUID, new content)
- **DELETE**: Removes existing memory (same UUID, completely gone)

---

## Part 3: Summary Generation (Background Process) - Deep Dive

When enough memories change, the system asynchronously updates the conversation summary using a background worker.

### Worker Configuration

- **Queue Name**: `summary-update`
- **Concurrency**: 3 jobs processed simultaneously
- **Job Retention**: Completed jobs kept for 1 hour, failed jobs for 24 hours
- **Connection**: Uses Redis (BullMQ) for job queue
- **Job Types**: 
  - One-off jobs (triggered by memory threshold)
  - Repeat jobs (periodic refresh every 3 minutes per conversation)

### Step 1: Worker Receives Job

When a job arrives in the queue, it contains:
```javascript
{
  conversationId: "uuid-here"
}
```

**Job Types:**
- **Type: 'update'**: One-off job from memory processor (threshold-based)
- **Type: 'periodic'**: Repeat job scheduled every 3 minutes

### Step 2: Verify Conversation Exists

**Database Query #1:**
```sql
SELECT * FROM conversations 
WHERE id = $conversationId 
LIMIT 1
```
**Purpose**: Verify the conversation still exists before processing
**Returns**: Conversation object with `id`, `userId`, `name`, `createdAt`
**Early Exit**: If conversation doesn't exist, worker:
  - Removes any periodic jobs for this conversation
  - Returns `{ skipped: true, reason: 'conversation_not_found' }`

### Step 3: Fetch Current Summary

**Database Query #2:**
```sql
SELECT * FROM summaries 
WHERE conversation_id = $conversationId 
LIMIT 1
```
**Purpose**: Get existing summary to update it (not replace from scratch)
**Returns**: Summary object with `conversationId`, `text`, `updatedAt`
**Fallback**: If no summary exists, uses empty string `''`

### Step 4: Fetch Recent Messages

**Database Query #3:**
```sql
SELECT * FROM messages 
WHERE conversation_id = $conversationId 
ORDER BY created_at DESC 
LIMIT 50
```
**Purpose**: Get the last 50 messages to summarize
**Returns**: Array of 50 most recent messages, sorted descending (newest first)
**Processing**: Array is reversed to chronological order (oldest first)
**Note**: Includes both user and assistant messages

**Early Exit Check:**
If `recentMessages.length === 0` (no messages):
```sql
-- Check if summary exists
SELECT * FROM summaries 
WHERE conversation_id = $conversationId 
LIMIT 1

-- If exists, clear it
UPDATE summaries 
SET text = '', updated_at = NOW() 
WHERE conversation_id = $conversationId

-- If doesn't exist, create empty one
INSERT INTO summaries (conversation_id, text) 
VALUES ($conversationId, '')
```
Worker returns empty string `''` and exits.

### Step 5: Build Summary Prompt

The `buildSummaryPrompt` function creates a comprehensive prompt:

**Prompt Structure:**
```
You are maintaining a concise, factual summary of a long conversation.

Current summary (may be outdated or empty):
[Current summary text or "(empty or outdated)"]

Recent messages (last 50):
user: [message content]
assistant: [message content]
user: [message content]
...

Task:
Rewrite the summary to include all important facts from the new messages.

Requirements:
- Keep it under 400 tokens
- Only include factual, permanent information (names, preferences, life events, plans, relationships, etc.)
- Do NOT include temporary context like "user asked about weather" or conversational filler
- Do NOT repeat facts already in the current summary unless they changed
- Create a coherent, flowing summary (not a bullet list)
- Focus on what the user has revealed about themselves

Return ONLY the new summary text.
```

**Key Points:**
- Includes current summary (so LLM knows what's already covered)
- Includes all 50 recent messages (full context)
- Instructions emphasize factual, permanent information
- Explicitly excludes temporary/conversational content

### Step 6: Generate Summary with LLM

**LLM Call: Summary Generation**

**API Call:**
```javascript
openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: 'You are a summarization system. Create concise, factual summaries of user information from conversations.'
    },
    {
      role: 'user',
      content: buildSummaryPrompt(currentSummary, recentMessages)
    }
  ],
  temperature: 0.3,
  max_tokens: 400
})
```

**Parameters:**
- **Model**: `gpt-4o-mini` (cost-effective for summarization)
- **Temperature**: 0.3 (factual, less creative)
- **Max Tokens**: 400 (hard limit on summary length)
- **Purpose**: Condense 50 messages into a concise summary

**Response Processing:**
```javascript
const summaryText = response.choices[0].message.content.trim();
// Removes leading/trailing whitespace
```

**Example Flow:**
```
Input:
- Current summary: "Alex is a vegan who became vegan last month. Alex lives in Berlin."
- Recent messages: [50 messages including "I stopped being vegan, I'm now non-vegetarian"]

Output:
"Alex was vegan but stopped being vegan and is now non-vegetarian. Alex lives in Berlin."
```

### Step 7: Store Summary in Database

**Database Query #4: Check if Summary Exists**
```sql
SELECT * FROM summaries 
WHERE conversation_id = $conversationId 
LIMIT 1
```

**If Summary Exists (UPDATE):**
```sql
UPDATE summaries 
SET text = $summaryText, updated_at = NOW() 
WHERE conversation_id = $conversationId
```
**Changes**: Updates `text` field with new summary and `updatedAt` timestamp
**Note**: `conversationId` is the primary key, so only one summary per conversation

**If Summary Doesn't Exist (INSERT):**
```sql
INSERT INTO summaries (conversation_id, text, updated_at) 
VALUES ($conversationId, $summaryText, NOW())
```
**Purpose**: Create new summary row
**Error Handling**: If insert fails (e.g., race condition), logs warning but doesn't throw

**Database Schema:**
```sql
CREATE TABLE summaries (
  conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Key Points:**
- One summary per conversation (conversationId is primary key)
- `updated_at` tracks when summary was last refreshed
- Cascade delete: if conversation deleted, summary is automatically deleted

### Step 8: Return Result

Worker returns:
```javascript
{
  summaryLength: summaryText.length  // Character count
}
```

### Complete Flow Example

**Scenario**: 3 memories were added, triggering summary update

**Step-by-Step:**

1. **Worker picks up job** from `summary-update` queue
   - Job data: `{ conversationId: "abc-123" }`

2. **Verify conversation exists** (1 DB query)
   - Query: `SELECT * FROM conversations WHERE id = 'abc-123'`
   - Result: Conversation exists ✓

3. **Fetch current summary** (1 DB query)
   - Query: `SELECT * FROM summaries WHERE conversation_id = 'abc-123'`
   - Result: `{ text: "Alex is a vegan. Alex lives in Berlin." }`

4. **Fetch recent messages** (1 DB query)
   - Query: `SELECT * FROM messages WHERE conversation_id = 'abc-123' ORDER BY created_at DESC LIMIT 50`
   - Result: Array of 50 messages (chronologically reversed)

5. **Build prompt** (no external call)
   - Combines current summary + 50 messages
   - Adds instructions

6. **Generate summary** (1 LLM call)
   - Model: `gpt-4o-mini`
   - Temperature: 0.3
   - Max tokens: 400
   - Result: "Alex is a vegan who became vegan last month. Alex lives in Berlin. Alex's girlfriend is Kitkat."

7. **Check if summary exists** (1 DB query)
   - Query: `SELECT * FROM summaries WHERE conversation_id = 'abc-123'`
   - Result: Summary exists

8. **Update summary** (1 DB update)
   - Query: `UPDATE summaries SET text = '...', updated_at = NOW() WHERE conversation_id = 'abc-123'`
   - Result: Summary updated in database

**Total Operations:**
- **Database Queries**: 4 (verify conversation, get summary, get messages, check before update)
- **Database Updates**: 1 (UPDATE summaries table)
- **LLM Calls**: 1 (summary generation)
- **Queue Operations**: 0 (this is the worker processing the job)

### Periodic Summary Updates

When a conversation is created, the system schedules a **repeat job**:

```javascript
summaryUpdateQueue.add(
  'periodic',
  { conversationId },
  {
    repeat: {
      every: 3 * 60 * 1000  // Every 3 minutes
    },
    jobId: `summary-periodic-${conversationId}`
  }
)
```

**Purpose**: Keep summaries fresh even if memory threshold isn't met
**Frequency**: Every 3 minutes per conversation
**Cleanup**: If conversation is deleted, periodic job is removed by worker

**On Server Startup:**
The server also sets up periodic jobs for all existing conversations:
1. Removes old periodic jobs
2. Fetches all conversations from database
3. Schedules periodic job for each conversation

---

## Part 3.5: Logging Worker (Background Process) - Deep Dive

There's a third background worker that handles logging for analytics and monitoring. This worker processes logging jobs asynchronously so API responses aren't slowed down by database writes.

### Worker Configuration

- **Queue Name**: `logging`
- **Concurrency**: 10 jobs processed simultaneously (highest of all workers)
- **Connection**: Uses Redis (BullMQ) for job queue
- **Job Retention**: Default cleanup (completed jobs removed immediately)

### Step 1: Worker Receives Job

When a job arrives in the queue, it contains:
```javascript
{
  type: 'api_request' | 'retrieval',
  data: {
    // For api_request:
    userId: "uuid",
    endpoint: "/chat" | "/ask",
    statusCode: 200 | 400 | 500,
    durationMs: 150
    
    // For retrieval (if type is 'retrieval'):
    userId: "uuid",
    conversationId: "uuid",
    question: "What do you know about my diet?",
    topMemoryIds: ["uuid-1", "uuid-2"] | null,
    latencyMs: 45
  }
}
```

### Step 2: Process Based on Type

The worker checks the `type` field and processes accordingly:

#### Type: 'api_request'

**Database Operation:**
```sql
INSERT INTO api_requests (user_id, endpoint, status_code, duration_ms, created_at)
VALUES ($userId, $endpoint, $statusCode, $durationMs, NOW())
```

**Database Schema:**
```sql
CREATE TABLE api_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(50) NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Fields Explained:**
- `user_id`: Which user made the request (for analytics per user)
- `endpoint`: Which API endpoint was called (`/chat`, `/ask`, etc.)
- `status_code`: HTTP status code (200 = success, 400 = bad request, 500 = server error)
- `duration_ms`: How long the request took in milliseconds (performance metric)
- `created_at`: Timestamp of when the request was made

**Example Insert:**
```sql
INSERT INTO api_requests (user_id, endpoint, status_code, duration_ms, created_at)
VALUES (
  'user-uuid-123',
  '/chat',
  200,
  150,
  '2024-01-15 10:30:45'
);
```

#### Type: 'retrieval' (Currently Commented Out)

**Note**: The code to process retrieval logs is currently commented out in the worker. However, the routes still queue these jobs, so they're being queued but not processed.

**Intended Database Operation (when enabled):**
```sql
INSERT INTO retrieval_logs (
  user_id, 
  conversation_id, 
  question, 
  top_memory_ids, 
  latency_ms, 
  created_at
)
VALUES ($userId, $conversationId, $question, $topMemoryIds, $latencyMs, NOW())
```

**Database Schema:**
```sql
CREATE TABLE retrieval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  top_memory_ids JSON,
  latency_ms INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Fields Explained:**
- `user_id`: Which user asked the question
- `conversation_id`: Which conversation the question was in
- `question`: The exact question text
- `top_memory_ids`: JSON array of memory UUIDs that were retrieved and used
- `latency_ms`: How long the retrieval took (embedding + Pinecone search)
- `created_at`: Timestamp of when the question was asked

**Example Insert (when enabled):**
```sql
INSERT INTO retrieval_logs (
  user_id, 
  conversation_id, 
  question, 
  top_memory_ids, 
  latency_ms, 
  created_at
)
VALUES (
  'user-uuid-123',
  'conversation-uuid-456',
  'What do you know about my diet?',
  '["memory-uuid-1", "memory-uuid-2"]'::json,
  45,
  '2024-01-15 10:30:45'
);
```

### Step 3: Error Handling

If database insert fails:
```javascript
catch (error) {
  console.error('Error processing logging job:', error);
  throw error;  // Job will be retried by BullMQ
}
```

**Retry Behavior**: BullMQ automatically retries failed jobs according to its retry strategy.

### How Jobs Are Queued

#### From Chat Route

**When**: After generating assistant reply (both success and error cases)

**Success Case:**
```javascript
// In chat route
const start = Date.now();
// ... process chat ...
const durationMs = Date.now() - start;

loggingQueue.add('log', {
  type: 'api_request',
  data: {
    userId: req.user.id,
    endpoint: '/chat',
    statusCode: 200,
    durationMs: durationMs
  }
}).catch(error => {
  console.error('Error queueing API request log:', error);
  // Non-blocking - doesn't affect response
});
```

**Error Case:**
```javascript
catch (error) {
  const durationMs = Date.now() - start;
  const statusCode = error instanceof LLMError ? error.statusCode : 500;
  
  loggingQueue.add('log', {
    type: 'api_request',
    data: {
      userId: req.user.id,
      endpoint: '/chat',
      statusCode: statusCode,
      durationMs: durationMs
    }
  }).catch(logError => {
    console.error('Error queueing API request log:', logError);
  });
  
  // Then return error response
}
```

#### From Ask Route

**When**: After generating answer (both success and error cases)

**Success Case - Two Logs:**
```javascript
// 1. Retrieval log (queued but not processed - commented out in worker)
loggingQueue.add('log', {
  type: 'retrieval',
  data: {
    userId: req.user.id,
    conversationId: conversationId,
    question: question.trim(),
    topMemoryIds: topMemoryIds.length > 0 ? topMemoryIds : null,
    latencyMs: retrievalLatency
  }
}).catch(error => {
  console.error('Error queueing retrieval log:', error);
});

// 2. API request log (processed by worker)
loggingQueue.add('log', {
  type: 'api_request',
  data: {
    userId: req.user.id,
    endpoint: '/ask',
    statusCode: 200,
    durationMs: durationMs
  }
}).catch(error => {
  console.error('Error queueing API request log:', error);
});
```

**Note**: Ask route queues TWO logging jobs:
1. Retrieval log (for analytics on which memories were used)
2. API request log (for general API usage tracking)

### Complete Flow Example

**Scenario**: User calls `memory.chat("Hello")`

**Step-by-Step:**

1. **Chat route receives request**
   - Start timer: `const start = Date.now()`
   - Process chat (generate reply)
   - Calculate duration: `const durationMs = Date.now() - start`

2. **Queue logging job** (non-blocking)
   ```javascript
   loggingQueue.add('log', {
     type: 'api_request',
     data: {
       userId: req.user.id,
       endpoint: '/chat',
       statusCode: 200,
       durationMs: 150
     }
   })
   ```
   - Returns immediately (doesn't wait for processing)
   - Response sent to user

3. **Logging worker picks up job** (asynchronously)
   - Job in queue: `{ type: 'api_request', data: {...} }`

4. **Worker processes job**
   - Checks `type === 'api_request'`
   - Executes database insert:
     ```sql
     INSERT INTO api_requests (user_id, endpoint, status_code, duration_ms, created_at)
     VALUES ('user-uuid', '/chat', 200, 150, NOW())
     ```

5. **Job completes**
   - Log entry stored in database
   - Available for analytics queries

**Total Operations:**
- **Queue Operations**: 1 (add job to queue)
- **Database Operations**: 1 (INSERT into api_requests)
- **LLM Calls**: 0 (pure logging, no AI involved)

### Use Cases for Logged Data

**API Request Logs (`api_requests` table):**

1. **Analytics Dashboards:**
   ```sql
   -- Total requests per endpoint
   SELECT endpoint, COUNT(*) 
   FROM api_requests 
   GROUP BY endpoint;
   
   -- Average response time
   SELECT AVG(duration_ms) 
   FROM api_requests 
   WHERE endpoint = '/chat';
   
   -- Requests per user
   SELECT user_id, COUNT(*) 
   FROM api_requests 
   GROUP BY user_id;
   ```

2. **Performance Monitoring:**
   ```sql
   -- Slow requests (> 1 second)
   SELECT * FROM api_requests 
   WHERE duration_ms > 1000 
   ORDER BY duration_ms DESC;
   ```

3. **Error Tracking:**
   ```sql
   -- Error rate
   SELECT status_code, COUNT(*) 
   FROM api_requests 
   WHERE status_code >= 400 
   GROUP BY status_code;
   ```

**Retrieval Logs (`retrieval_logs` table - when enabled):**

1. **Memory Usage Analytics:**
   ```sql
   -- Most frequently retrieved memories
   SELECT memory_id, COUNT(*) 
   FROM retrieval_logs, jsonb_array_elements_text(top_memory_ids) AS memory_id
   GROUP BY memory_id 
   ORDER BY COUNT(*) DESC;
   ```

2. **Question Analysis:**
   ```sql
   -- Most common questions
   SELECT question, COUNT(*) 
   FROM retrieval_logs 
   GROUP BY question 
   ORDER BY COUNT(*) DESC;
   ```

3. **Performance:**
   ```sql
   -- Average retrieval latency
   SELECT AVG(latency_ms) 
   FROM retrieval_logs;
   ```

---

## Part 4: When a User Asks a Question (ask method)

Now let's see what happens when a user calls `memory.ask("What do you know about my diet?")`.

### Step 1: Question Arrives

The SDK sends a POST request to `/conversations/{conversationId}/ask` with:
- The question
- LLM provider settings

### Step 2: Retrieve Relevant Memories

#### 2a. Create Question Embedding

**LLM Call Made:**
- Model: `text-embedding-3-small`
- Purpose: Convert question to vector
- Output: 1536-dimensional vector

#### 2b. Search Pinecone

Query Pinecone with the question embedding to find the top 25 most similar memories (filtered by conversationId).

**Example Results:**
```
Memory 1: "User is vegan" (similarity: 0.92)
Memory 2: "User became vegan last month" (similarity: 0.88)
Memory 3: "User lives in Berlin" (similarity: 0.45)  // Less relevant
```

#### 2c. Fetch Full Memory Details

Fetch the actual memory content from the database for the top matching IDs.

### Step 3: Generate Answer with LLM

**LLM Call Made:**
- Model: Your specified model
- Purpose: Answer the question using retrieved memories
- Temperature: 0.3 (factual)
- Max Tokens: 500

The prompt includes:
- All retrieved memories with timestamps ("2 days ago", "last week")
- The question
- Instructions to understand context, temporal relationships, and implied questions

**Example Prompt:**
```
Relevant memories:
• User is vegan (2 days ago)
• User became vegan last month (1 month ago)

Question: What do you know about my diet?

Answer using the memories above...
```

**Example Output:**
```
"You became vegan last month and are currently following a vegan diet."
```

### Step 4: Queue Logging (Background)

After returning the answer, the system queues a logging job to record:
- The question asked
- Which memory IDs were retrieved
- Retrieval latency
- This happens asynchronously and doesn't slow down the response

### Step 5: Return Answer

The answer is returned to the user along with metadata (how many memories were used).

---

## SDK Methods Summary

### 1. `memory.chat(message)`
- **What it does**: Sends a message and gets a conversational reply
- **LLM calls**: 1 (generates reply)
- **Stores**: User message + assistant reply in `messages` table
- **Background**: Queues memory extraction job + API request logging job

### 2. `memory.ask(question)`
- **What it does**: Asks a question and gets an answer based on memories
- **LLM calls**: 2 (create embedding + generate answer)
- **Stores**: Nothing (read-only operation)
- **Retrieves**: Relevant memories from Pinecone + database
- **Background**: Queues retrieval logging job + API request logging job

### 3. `memory.say(message)`
- **What it does**: Smart routing - automatically decides between chat or ask
- **Logic**: Uses heuristics (question words, keywords) to route
- **If question-like**: Routes to `ask()`
- **If conversational**: Routes to `chat()`

### 4. `memory.createConversation(name)`
- **What it does**: Creates a new conversation
- **Stores**: New row in `conversations` table
- **Side effect**: Automatically schedules a periodic summary refresh job (every 3 minutes) for this conversation
- **Returns**: Conversation ID

### 5. `memory.listConversations()`
- **What it does**: Lists all conversations for the user
- **Retrieves**: All conversations from database

---

## Database Tables at a Glance

### `messages`
- Stores every chat message (user + assistant)
- Columns: `id`, `conversationId`, `role`, `content`, `createdAt`

### `memories`
- Stores extracted facts (forever, until updated/deleted)
- Columns: `id`, `conversationId`, `content`, `createdAt`, `updatedAt`
- Each memory has a corresponding vector in Pinecone

### `summaries`
- Stores conversation summary (≤400 tokens)
- Columns: `conversationId`, `text`, `updatedAt`
- One summary per conversation
- Updated asynchronously by background workers when memories change significantly

### `conversations`
- Stores conversation metadata
- Columns: `id`, `userId`, `name`, `createdAt`

### `apiRequests`
- Stores API request logs for analytics
- Columns: `id`, `userId`, `endpoint`, `statusCode`, `durationMs`, `createdAt`
- Populated asynchronously by logging worker

### `retrievalLogs`
- Stores retrieval event logs (for ask requests)
- Columns: `id`, `userId`, `conversationId`, `question`, `topMemoryIds`, `latencyMs`, `createdAt`
- Populated asynchronously by logging worker

---

## LLM Calls Summary

### During `chat()`:
1. **1 LLM call**: Generate conversational reply (user's provider/model)

### During Memory Extraction (background):
1. **1 LLM call**: Extract facts from message (`gpt-4o-mini`)
2. **N LLM calls**: Create embeddings for each fact (`text-embedding-3-small`)
3. **N LLM calls**: Decide action (ADD/UPDATE/DELETE) for each fact (`gpt-4o-mini`)

### During Summary Update (background):
1. **1 LLM call**: Generate summary from recent messages (`gpt-4o-mini`)

### During `ask()`:
1. **1 LLM call**: Create question embedding (`text-embedding-3-small`)
2. **1 LLM call**: Generate answer using retrieved memories (user's provider/model)

### During Logging (background):
- No LLM calls - just database inserts for analytics

---

## Key Design Decisions

1. **Asynchronous Memory Processing**: Messages are processed in background workers (BullMQ/Redis queues) so users get instant replies. Memory extraction and summary updates happen completely asynchronously.

2. **Three Background Workers**: 
   - **Memory Processor**: Extracts facts and manages memories (concurrency: 5)
   - **Summary Processor**: Updates conversation summaries (concurrency: 3)
   - **Logging Processor**: Records API requests and retrieval events for analytics (concurrency: 10)

3. **Queue-Based Architecture**: Uses BullMQ with Redis for reliable job queuing. Workers run separately from the API server, allowing horizontal scaling.

3. **Embedding-based Similarity**: Uses vector embeddings to find related memories, even if wording differs. Pinecone stores embeddings for fast similarity search.

4. **Smart Memory Updates**: LLM decides whether new facts should ADD, UPDATE, or DELETE existing memories, preventing contradictions and keeping memories accurate.

5. **Conversation Summaries**: Generated from recent messages (50) and stored in database. Used in extraction prompts to prevent re-extracting facts that are already known. Updated asynchronously when 3+ memories are added or 2+ are updated.

6. **Temporal Context**: Answers include timestamps to help understand when things happened. Memories track creation and update times.

7. **Batched Summary Updates**: Summary updates are delayed by 5 seconds and batched together, so multiple memory changes trigger a single summary update.

---

## Example Flow: Complete Conversation

Let's trace a complete example:

```javascript
// User sends a message
await memory.chat("Hi, I'm Alex. I became vegan last month.");

// What happens:
// 1. Message stored in messages table
// 2. Assistant reply generated (1 LLM call)
// 3. Reply stored in messages table
// 4. Memory extraction job queued (background)

// Background: Memory extraction (asynchronous worker)
// - Worker picks up job from memory-process queue
// - Extract facts: ["User's name is Alex", "User became vegan last month"]
// - Create embeddings (2 LLM calls)
// - No similar memories found → ADD both (2 LLM calls for decision)
// - Store 2 new memories in database + Pinecone
// - Since 2 memories added (< 3), no summary update triggered yet

// User asks a question
await memory.ask("What do you know about my diet?");

// What happens:
// 1. Create question embedding (1 LLM call)
// 2. Search Pinecone → find "User became vegan last month"
// 3. Generate answer using memory (1 LLM call)
// 4. Return: "You became vegan last month and are following a vegan diet."
```

---

## Conclusion

The memory layer is built on a simple principle: extract facts from conversations, store them with embeddings for fast retrieval, and use LLMs to maintain and query this knowledge. The system is designed to be efficient (background processing), smart (LLM-guided decisions), and scalable (vector search).

All the complexity is hidden behind simple SDK methods like `chat()`, `ask()`, and `say()`, making it easy to add long-term memory to any application.

