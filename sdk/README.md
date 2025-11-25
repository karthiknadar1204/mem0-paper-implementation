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
  baseUrl: 'https://mem0-paper-implementation-production.up.railway.app',    // Required
  llmProvider: 'openai',                  // Required: 'openai' | 'gemini'
  llmApiKey: process.env.OPENAI_KEY,      // Required: Bring-your-own LLM key
  llmModel: 'gpt-4o-mini',                // Optional: override model per provider
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

## Configuration

```javascript
const memory = new NormalMemory({
  apiKey: 'sk_backend_key',                 // Required: Normal Memory API key
  conversationId: 'conversation-id',        // Required: Conversation ID (GET /conversations)
  baseUrl: 'https://your-backend-url.com',  // Required: Backend URL
  llmProvider: 'openai',                    // Required: 'openai' | 'gemini'
  llmApiKey: process.env.OPENAI_KEY,        // Required: Bring-your-own LLM key
  llmModel: 'gpt-4o-mini',                  // Optional: provider-specific override
});

### Bring Your Own LLM

You can route chat/ask responses through your own OpenAI or Gemini account:

```javascript
const memory = new NormalMemory({
  apiKey: 'sk_backend_key',         // Normal Memory API key
  conversationId: 'conversation-id',
  llmProvider: 'gemini',            // Required: 'openai' or 'gemini'
  llmApiKey: process.env.GEMINI_KEY,// Required: Bring-your-own key
  llmModel: 'gemini-1.5-flash',     // Optional provider-specific model
});
```

- Every request must include `llmProvider` and `llmApiKey`; the backend never falls back to shared keys.
- Gemini requests require `llmApiKey` because we never store user LLM keys.
- Embeddings and background memory processing still use the backend's managed keys.
```

### Supported Providers & Models

- **OpenAI** — Works with every chat/completions-capable OpenAI model (e.g. `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `o4-mini`, realtime previews, etc.). Set `llmProvider: 'openai'` and pass the exact model string; the SDK simply forwards it and surfaces provider errors if a model isn’t accessible to your key.
- **Google Gemini** — Use `llmProvider: 'gemini'` with models such as `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash-001`, or `gemini-2.0-flash-lite-001`. We validate the model name before sending the request so you get fast feedback on typos.
- **Key handling** — Your OpenAI/Gemini keys are only used per request and never persisted; embeddings, retrieval, and background memory jobs continue to run on Normal Memory-managed keys.

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
- `config.apiKey` (string, required): Your Normal Memory API key
- `config.conversationId` (string, required): Conversation ID
- `config.baseUrl` (string, optional): Backend URL
- `config.llmProvider` (string, required): `'openai'` or `'gemini'`
- `config.llmApiKey` (string, required): BYO LLM API key (never stored server-side)
- `config.llmModel` (string, optional): Provider-specific model override

### Methods

#### `say(message: string): Promise<string>`

Main method that automatically routes to `/chat` or `/ask`.

#### `chat(message: string): Promise<string>`

Normal conversation with immediate LLM response.

#### `ask(question: string): Promise<string>`

Ask question using long-term memory.

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



