export class SmartRouter {
  constructor() {
    // No cache - simple heuristic-based routing
  }

  async decide(message) {
    // Use heuristic-based routing (fast, zero cost)
    return this.heuristicRoute(message);
  }

  heuristicRoute(message) {
    const trimmed = message.trim().toLowerCase();

    const questionPatterns = [
      /^(what|who|where|when|why|how|which|whose)\s+/i,
      /^(tell me|remember|do you know|do you remember|what did i|what did you|what have i|what have you)/i,
      /(what|who|where|when|why|how)\s+(do|did|does|will|can|should|is|are|was|were)\s+(you|i)/i,
      /\?$/,
    ];

    for (const pattern of questionPatterns) {
      if (pattern.test(trimmed)) {
        return 'ask';
      }
    }

    const memoryKeywords = [
      'remember',
      'recall',
      'know about',
      'tell me about',
      'what do you know',
      'what did i say',
      'what did i tell',
    ];

    for (const keyword of memoryKeywords) {
      if (trimmed.includes(keyword)) {
        return 'ask';
      }
    }

    return 'chat';
  }
}

