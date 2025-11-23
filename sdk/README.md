# Normal Memory SDK

**One memory. Any model. Forever.**

The first truly model-agnostic, open-source, self-hostable memory layer for AI applications.

## Installation

```bash
npm install normal-memory
```

## Quick Start

```javascript
import { NormalMemory } from 'normal-memory';

// Step 1: Get your conversation ID from your backend
// Call GET /conversations endpoint to get your conversation IDs
// Or create one using POST /conversations

// Step 2: Initialize SDK with REQUIRED conversationId
const memory = new NormalMemory({
  apiKey: 'sk_4f8a9c2d_...',              // Required: Your API key
  conversationId: 'your-conversation-id',  // Required: Conversation ID
  baseUrl: 'https://your-backend.com',    // Optional: defaults to http://localhost:4000
  model: 'gpt-4o-mini',                   // Optional: any model works
});

// Step 3: Now use it!
await memory.say("Hi, I'm Alex. I became vegan last month and live in Berlin.");

// Wait a moment for memory extraction, then ask
const answer = await memory.ask("Where do I live and what's my diet?");

console.log(answer);
// → "You live in Berlin and you've been vegan since last month."
```

## API

### `memory.say(message)`

The only method you'll ever need. Automatically routes to the right endpoint based on context.

```javascript
// Conversation (automatically uses /chat)
await memory.say("I'm feeling sad today");

// Memory recall (automatically uses /ask)
await memory.say("What do you remember about my diet?");
```

### `memory.chat(message)`

Explicitly start a conversation. Gets immediate LLM response.

```javascript
const reply = await memory.chat("Hi, I'm Alex");
// → "Hey Alex! Nice to meet you."
```

### `memory.ask(question)`

Explicitly ask a question using long-term memory.

```javascript
const answer = await memory.ask("What do you know about me?");
// → Uses all stored memories to answer
```

### Conversation Management

```javascript
// IMPORTANT: conversationId is REQUIRED in constructor
// You must get it from your backend first:

// Option 1: Get existing conversation ID from backend
// Call GET /conversations endpoint to get your conversation IDs
const memory = new NormalMemory({
  apiKey: 'sk_...',
  conversationId: 'existing-conversation-id', // Required
});

// Option 2: Create new conversation (requires temporary instance)
// First create a temporary instance to call createConversation
// Then create a new instance with the returned ID

// Get current conversation ID
const id = memory.getConversationId();

// Switch to different conversation (requires new instance)
// You cannot change conversationId after initialization
// Create a new NormalMemory instance with the new conversationId
```

## Configuration

```javascript
const memory = new NormalMemory({
  apiKey: 'sk_...',              // Required: Your API key
  conversationId: '...',         // Required: Conversation ID (get from GET /conversations)
  baseUrl: 'https://...',        // Optional: Backend URL (default: http://localhost:4000)
  model: 'gpt-4o-mini',          // Optional: Model name (default: gpt-4o-mini)
  smartRouting: true,             // Optional: Enable smart routing (default: true)
});
```

## Model Agnostic

Works with any LLM:

- OpenAI: `model: "gpt-4o-mini"`
- Gemini: `model: "gemini-1.5-flash"`
- Claude: `model: "claude-3-haiku"`

Memory stays the same. Only the brain answering changes.

## How It Works

1. **Smart Routing**: `.say()` automatically detects if you're asking a question (uses `/ask`) or having a conversation (uses `/chat`)
2. **Memory Storage**: All conversations are automatically stored and extracted into long-term memories
3. **Instant Responses**: `/chat` gives immediate replies while memory extraction happens in background
4. **Perfect Recall**: `/ask` uses all stored memories to answer questions accurately

## License

ISC

