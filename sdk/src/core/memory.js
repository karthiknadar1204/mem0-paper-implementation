import { HttpClient } from '../http/client.js';
import { ConversationManager } from './conversation.js';
import { SmartRouter } from './router.js';

export class NormalMemory {
  constructor(config = {}) {
    const {
      apiKey,
      conversationId,
      baseUrl = 'https://mem0-paper-implementation-production.up.railway.app',
      model = 'gpt-4o-mini',
      smartRouting = true,
    } = config;

    if (!apiKey) {
      throw new Error('apiKey is required');
    }

    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error(
        'conversationId is required. Please:\n' +
        '1. Call GET /conversations to get your conversation IDs\n' +
        '2. Pass conversationId in the constructor: new NormalMemory({ apiKey, conversationId: "..." })'
      );
    }

    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.smartRouting = smartRouting;
    this.conversationId = conversationId;

    this.client = new HttpClient(baseUrl, apiKey);
    this.conversationManager = new ConversationManager(this.client);
    this.router = smartRouting ? new SmartRouter() : null;

    this.conversationManager.setConversationId(conversationId);
  }

  async say(message) {
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('message must be a non-empty string');
    }

    this.conversationManager.requireConversationId();

    if (this.smartRouting && this.router) {
      const route = await this.router.decide(message);
      return route === 'ask' ? this.ask(message) : this.chat(message);
    }

    return this.chat(message);
  }

  async chat(message) {
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('message must be a non-empty string');
    }

    const conversationId = this.conversationManager.requireConversationId();

    const response = await this.client.post(
      `/conversations/${conversationId}/chat`,
      { message: message.trim() }
    );

    return response.reply;
  }

  async ask(question) {
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      throw new Error('question must be a non-empty string');
    }

    const conversationId = this.conversationManager.requireConversationId();

    const response = await this.client.post(
      `/conversations/${conversationId}/ask`,
      { question: question.trim() }
    );

    return response.answer;
  }

  setConversation(conversationId) {
    this.conversationId = conversationId;
    this.conversationManager.setConversationId(conversationId);
  }

  getConversationId() {
    return this.conversationManager.getConversationId();
  }

  async createConversation(name = null) {
    const conversation = await this.conversationManager.createConversation(name);
    this.conversationId = conversation.id;
    return conversation.id;
  }

  async listConversations() {
    return await this.conversationManager.listConversations();
  }
}

