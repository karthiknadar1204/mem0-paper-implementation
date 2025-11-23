// Example usage of Normal Memory SDK

import { NormalMemory } from './src/index.js';

async function example() {
  try {
    // Step 1: First, get your API key and list conversations
    // You need to create a temporary instance just to call listConversations
    // In real usage, you'd get conversationId from your backend/database
    
    // For this example, we'll use a known conversationId
    const conversationId = '4e4c8ef0-9bfa-4d06-b012-b7b9316dc144';
    
    // Step 2: Initialize SDK with required conversationId
    const memory = new NormalMemory({
      apiKey: 'sk_1f6381a97bef8602fa2e3ecbcdb79c9c4076e17e82090b36b5196426be023c7e', // Your API key
      conversationId: conversationId, // REQUIRED: Conversation ID
      baseUrl: 'http://localhost:4000', // Optional: Your backend URL
      model: 'gpt-4o-mini', // Optional: model name
    });

    console.log('=== Using conversation:', conversationId, '===');

    console.log('\n=== Step 2: Using .say() with smart routing ===');
    
    const reply1 = await memory.say("Hi, I'm Alex. I became vegan last month and live in Berlin.");
    console.log('Reply:', reply1);

    // This will use /ask (memory recall question)
    const reply2 = await memory.say("What do you know about my diet?");
    console.log('Answer:', reply2);

    // Explicit methods
    console.log('\n=== Using explicit methods ===');
    
    const chatReply = await memory.chat("I'm feeling great today!");
    console.log('Chat:', chatReply);

    const askAnswer = await memory.ask("Where do I live?");
    console.log('Ask:', askAnswer);

    // Conversation management
    console.log('\n=== Conversation Management ===');
    console.log('Current conversation ID:', memory.getConversationId());

    // Note: To switch conversations, you need to create a new NormalMemory instance
    // with the new conversationId, or use setConversation (but you'd need to get
    // the conversationId first from listConversations using a temporary instance)

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run example
example();

