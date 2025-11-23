# Normal Memory SDK

**Persistent memory for AI applications.**

A JavaScript SDK for building AI applications with long-term memory, smart routing, and conversation management.

## Installation

```bash
npm install normal-memory
```

## Quick Start

```javascript
import { NormalMemory } from 'normal-memory';

// Step 1: Get your API key and conversation ID from your backend
// - Create an API key via your dashboard or POST /api-keys
// - Get conversation ID via GET /conversations or create one with POST /conversations

// Step 2: Initialize SDK
const memory = new NormalMemory({
  apiKey: 'sk_4f8a9c2d_...',              // Required: Your API key
  conversationId: 'your-conversation-id',  // Required: Conversation ID
  baseUrl: 'https://your-backend.com',    // Optional: defaults to http://localhost:4000
  model: 'gpt-4o-mini',                   // Optional: model name (not currently used)
});

// Step 3: Use it!
await memory.say("Hi, I'm Alex. I became vegan last month and live in Berlin.");

// Ask questions using stored memories
const answer = await memory.ask("Where do I live and what's my diet?");
console.log(answer);
// → "You live in Berlin and you've been vegan since last month."
```

## Core Methods

### `memory.say(message)`

**The main method** - automatically routes to the right endpoint based on message content.

```javascript
// Normal conversation (automatically uses /chat)
await memory.say("I'm feeling great today!");

// Memory recall question (automatically uses /ask)
await memory.say("What do you remember about my diet?");
```

**How it works:**
- Detects question patterns (what, who, where, "tell me", "remember", etc.)
- Routes to `/ask` for memory questions
- Routes to `/chat` for normal conversation
- Can be disabled with `smartRouting: false`

### `memory.chat(message)`

Explicitly start a conversation. Gets immediate LLM response while memory extraction happens in background.

```javascript
const reply = await memory.chat("Hi, I'm Alex");
// → "Hey Alex! Nice to meet you."
// Memory extraction happens in background (fire-and-forget)
```

**Use when:**
- You want a conversational response
- You're sharing new information
- You want immediate feedback

### `memory.ask(question)`

Explicitly ask a question using long-term memory. Retrieves relevant memories and answers using them.

```javascript
const answer = await memory.ask("What do you know about me?");
// → Uses all stored memories to answer accurately
```

**Use when:**
- You want to recall stored information
- You're asking about past conversations
- You need accurate memory-based answers

## Conversation Management

### Getting Conversation ID

```javascript
// Option 1: List all conversations
const conversations = await memory.listConversations();
// Returns: [{ id, name, createdAt }, ...]

// Option 2: Create new conversation
const newId = await memory.createConversation("My Project");
// Returns: conversation ID string
```

### Switching Conversations

```javascript
// Get current conversation ID
const currentId = memory.getConversationId();

// Switch to different conversation
memory.setConversation("new-conversation-id");
```

## Configuration

```javascript
const memory = new NormalMemory({
  apiKey: 'sk_...',              // Required: Your API key from dashboard
  conversationId: '...',         // Required: Conversation ID (get from GET /conversations)
  baseUrl: 'https://...',        // Optional: Backend URL (default: http://localhost:4000)
  model: 'gpt-4o-mini',          // Optional: Model name (default: gpt-4o-mini)
  smartRouting: true,            // Optional: Enable smart routing (default: true)
});
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiKey` | string | ✅ Yes | - | Your API key from the dashboard |
| `conversationId` | string | ✅ Yes | - | Conversation ID (get from `/conversations` endpoint) |
| `baseUrl` | string | ❌ No | `http://localhost:4000` | Your backend URL |
| `model` | string | ❌ No | `gpt-4o-mini` | Model name (for future use) |
| `smartRouting` | boolean | ❌ No | `true` | Enable automatic routing in `.say()` |

## Backend Requirements

This SDK requires a running Normal Memory backend server. The backend handles:

- Memory storage and retrieval
- LLM integration
- Conversation management
- API authentication

**Note**: The backend must be set up separately. See your backend documentation for setup instructions.

## How It Works

### Smart Routing

The `.say()` method uses heuristics to detect intent:

**Routes to `/ask` (memory recall) when:**
- Starts with question words: what, who, where, when, why, how, which, whose
- Contains memory keywords: "remember", "recall", "know about", "tell me about"
- Ends with `?`
- Contains patterns like "what did I", "what do you know"

**Routes to `/chat` (conversation) when:**
- Normal statements
- Sharing information
- Casual conversation

### Memory Flow

1. **Chat Flow** (`/chat`):
   ```
   User message → Immediate LLM response → Background memory extraction
   ```
   - Gets instant reply (<800ms)
   - Memory extraction happens in background
   - User doesn't wait for memory processing

2. **Ask Flow** (`/ask`):
   ```
   Question → Retrieve relevant memories → LLM answer using memories
   ```
   - Searches vector database for relevant memories
   - Uses top memories as context
   - Returns accurate answer based on stored information

## Examples

### Basic Usage

```javascript
import { NormalMemory } from 'normal-memory';

const memory = new NormalMemory({
  apiKey: 'sk_...',
  conversationId: '...',
  baseUrl: 'https://api.example.com',
});

// Share information
await memory.say("I'm Alex and I love coding");

// Ask about it later
const answer = await memory.say("What's my name?");
console.log(answer); // → "Your name is Alex"
```

### Multiple Conversations

```javascript
// Project 1
const project1 = new NormalMemory({
  apiKey: 'sk_...',
  conversationId: 'project-1-id',
});

// Project 2
const project2 = new NormalMemory({
  apiKey: 'sk_...',
  conversationId: 'project-2-id',
});

await project1.say("I'm working on a web app");
await project2.say("I'm building a mobile app");
```

### Explicit Methods

```javascript
// Force conversation mode
const reply = await memory.chat("I'm feeling great!");

// Force memory recall
const answer = await memory.ask("What did I say about my mood?");
```

## API Reference

### Constructor

```javascript
new NormalMemory(config)
```

Creates a new NormalMemory instance.

**Parameters:**
- `config.apiKey` (string, required): Your API key
- `config.conversationId` (string, required): Conversation ID
- `config.baseUrl` (string, optional): Backend URL
- `config.model` (string, optional): Model name
- `config.smartRouting` (boolean, optional): Enable smart routing

### Methods

#### `say(message: string): Promise<string>`

Main method that automatically routes to `/chat` or `/ask`.

#### `chat(message: string): Promise<string>`

Normal conversation with immediate LLM response.

#### `ask(question: string): Promise<string>`

Ask question using long-term memory.

#### `getConversationId(): string`

Get current conversation ID.

#### `setConversation(conversationId: string): void`

Switch to different conversation.

#### `createConversation(name?: string): Promise<string>`

Create new conversation and return its ID.

#### `listConversations(): Promise<Array<{id, name, createdAt}>>`

List all conversations for the authenticated user.

## Error Handling

```javascript
try {
  const answer = await memory.ask("What do you know?");
} catch (error) {
  if (error.message.includes('conversationId is required')) {
    // Handle missing conversation ID
  } else if (error.message.includes('Failed to')) {
    // Handle API errors
  }
}
```

## Requirements

- Node.js >= 18.0.0
- Valid API key from your backend
- Valid conversation ID

## Backend Setup

This SDK requires a running Normal Memory backend. See the main repository for backend setup instructions.

**Required Backend Endpoints:**
- `POST /conversations/:id/chat` - Conversational chat
- `POST /conversations/:id/ask` - Memory recall
- `GET /conversations` - List conversations
- `POST /conversations` - Create conversation

## License

ISC

## Support

- GitHub Issues: [https://github.com/yourusername/normal-memory/issues](https://github.com/yourusername/normal-memory/issues)
- Documentation: [https://github.com/yourusername/normal-memory](https://github.com/yourusername/normal-memory)
