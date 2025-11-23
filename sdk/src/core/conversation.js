export class ConversationManager {
  constructor(client) {
    this.client = client;
    this.conversationId = null;
  }

  setConversationId(id) {
    if (!id || typeof id !== 'string') {
      throw new Error('conversationId must be a non-empty string');
    }
    this.conversationId = id;
  }

  getConversationId() {
    return this.conversationId;
  }

  requireConversationId() {
    if (!this.conversationId) {
      throw new Error(
        'conversationId is required. Please:\n' +
        '1. Call GET /conversations to get your conversation IDs\n' +
        '2. Pass conversationId in the constructor: new NormalMemory({ apiKey, conversationId: "..." })\n' +
        '3. Or use memory.setConversation("conversation-id") before calling say/chat/ask'
      );
    }
    return this.conversationId;
  }

  async createConversation(name = null) {
    try {
      const body = name ? { name } : {};
      const conversation = await this.client.post('/conversations', body);
      this.conversationId = conversation.id;
      return conversation;
    } catch (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
  }

  async listConversations() {
    try {
      return await this.client.get('/conversations');
    } catch (error) {
      throw new Error(`Failed to list conversations: ${error.message}`);
    }
  }
}

