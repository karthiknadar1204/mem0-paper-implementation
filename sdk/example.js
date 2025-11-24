// Example usage of Normal Memory SDK

import { NormalMemory } from './src/index.js';

async function example() {
  try {
    // Step 1: First, get your API key and list conversations
    // You need to create a temporary instance just to call listConversations
    // In real usage, you'd get conversationId from your backend/database
    
    // For this example, we'll use a known conversationId
    const conversationId = 'e6b3a17f-8510-4dc1-825d-9d934f239e27';
    
    // Step 2: Initialize SDK with required conversationId
    const memory = new NormalMemory({
      apiKey: 'sk_8d93146f1647f21e8f519a72858add000ad7566739e3b5358d15f4ecab49bc25', // Your API key
      conversationId: conversationId, // REQUIRED: Conversation ID
      baseUrl: 'http://localhost:4000', // Optional: Your backend URL
      model: 'gpt-4o-mini', // Optional: default OpenAI model
      llmProvider: 'openai', // Optional: 'openai' (default) or 'gemini'
      llmApiKey: process.env.OPENAI_KEY, // Optional: Bring-your-own OpenAI/Gemini key
      llmModel: 'gpt-4o-mini', // Optional: provider-specific override
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

    // Adding more data
    console.log('\n=== Adding more data ===');
    
    const chatReply2 = await memory.chat("my girlfriend name is kitkat");
    console.log('Chat:', chatReply2);

    const chatReply3 = await memory.chat("i stopped being a vegan, i am now a non vegetarian");
    console.log('Chat:', chatReply3);

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

