export const buildExtractionPrompt = (summary, recentMessages, previousMessage, newMessage) => {
  const summaryText = summary || '(empty)';

  const messagesText = recentMessages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  const exchangeText = previousMessage
    ? `Previous message: ${previousMessage.role}: ${previousMessage.content}\n\nNEW message to extract from: ${newMessage.role}: ${newMessage.content}`
    : `NEW message to extract from: ${newMessage.role}: ${newMessage.content}`;

  return `Conversation summary (for context only - do not extract from this):
${summaryText}

Recent conversation history (for context only - do not extract from these):
${messagesText}

IMPORTANT: Extract ONLY new, important facts stated in the NEW message below. Do NOT re-extract facts that were already mentioned in previous messages or the summary. Focus strictly on what is NEW in this specific message.

${exchangeText}

Extract facts that are:
1. Stated explicitly in the NEW message above
2. Not already covered in the summary or recent messages
3. Important and factual (not conversational filler)

IMPORTANT: If the message contains multiple distinct facts, extract them separately. For example:
- "I stopped being vegan and I'm non-veg now" → Extract as TWO facts: ["User has stopped being a vegan", "User is now non-vegetarian"]
- "My name is Alex and I'm vegan" → Extract as TWO facts: ["User's name is Alex", "User is vegan"]

Return a JSON object with a "facts" array containing fact strings. Each fact should be a standalone statement. Example JSON: {"facts": ["User's name is Alex", "User is vegan"]}`;
};

export const buildToolCallingPrompt = (candidateFact, similarMemories) => {
  if (!similarMemories || similarMemories.length === 0) {
    return `Candidate fact: "${candidateFact}"

No similar memories found. This is a new fact.

Return your decision as a JSON object: { "action": "ADD", "memoryId": null }`;
  }
  const memoriesText = similarMemories
    .map((mem, idx) => `${idx + 1}. Memory ID: ${mem.id}, Content: "${mem.content}"`)
    .join('\n');

  return `Candidate fact: "${candidateFact}"

Existing similar memories:
${memoriesText}

Decide what action to take:
- ADD: This is a completely new fact (no similar memory exists or this adds new information)
- UPDATE: This fact updates/refines an existing memory (use the memoryId of the most similar one)
- DELETE: This fact contradicts an existing memory (use the memoryId of the contradicted one)

Return your decision as a JSON object: { "action": "ADD" | "UPDATE" | "DELETE", "memoryId": "uuid" (only for UPDATE/DELETE) }`;
};

export const buildSummaryPrompt = (currentSummary, recentMessages) => {
  const summaryText = currentSummary || '(empty or outdated)';
  
  const messagesText = recentMessages
    .map((msg, idx) => `${msg.role}: ${msg.content}`)
    .join('\n');

  return `You are maintaining a concise, factual summary of a long conversation.

Current summary (may be outdated or empty):
${summaryText}

Recent messages (last ${recentMessages.length}):
${messagesText}

Task:
Rewrite the summary to include all important facts from the new messages.

Requirements:
- Keep it under 400 tokens
- Only include factual, permanent information (names, preferences, life events, plans, relationships, etc.)
- Do NOT include temporary context like "user asked about weather" or conversational filler
- Do NOT repeat facts already in the current summary unless they changed
- Create a coherent, flowing summary (not a bullet list)
- Focus on what the user has revealed about themselves

Return ONLY the new summary text.`;
};

export const buildAnswerPrompt = (memories, question) => {
  if (!memories || memories.length === 0) {
    return `Question: ${question}

You have no relevant memories about this topic.

Respond with: "I don't recall any information about that."`;
  }

  const currentDate = new Date();
  const currentDateStr = currentDate.toISOString().split('T')[0];

  const memoriesWithTime = memories.map((mem, idx) => {
    const memContent = typeof mem === 'string' ? mem : mem.content;
    const createdAt = typeof mem === 'string' ? null : mem.createdAt;
    const updatedAt = typeof mem === 'string' ? null : mem.updatedAt;
    
    let timeInfo = '';
    if (createdAt) {
      const createdDate = new Date(createdAt);
      const daysAgo = Math.floor((currentDate - createdDate) / (1000 * 60 * 60 * 24));
      
      if (daysAgo === 0) {
        timeInfo = ' (today)';
      } else if (daysAgo === 1) {
        timeInfo = ' (yesterday)';
      } else if (daysAgo < 7) {
        timeInfo = ` (${daysAgo} days ago)`;
      } else if (daysAgo < 30) {
        const weeksAgo = Math.floor(daysAgo / 7);
        timeInfo = ` (${weeksAgo} week${weeksAgo > 1 ? 's' : ''} ago)`;
      } else {
        const monthsAgo = Math.floor(daysAgo / 30);
        timeInfo = ` (${monthsAgo} month${monthsAgo > 1 ? 's' : ''} ago)`;
      }
      
      if (updatedAt && updatedAt.getTime() !== createdAt.getTime()) {
        timeInfo += ' [updated]';
      }
    }
    
    return `• ${memContent}${timeInfo}`;
  }).join('\n');

  return `You are an intelligent assistant with perfect long-term memory. Today's date is ${currentDateStr}.

Relevant memories from past conversation (with temporal context):

----------------------------------------
${memoriesWithTime}
----------------------------------------

Question: ${question}

CRITICAL INSTRUCTIONS FOR CONTEXT-AWARE ANSWERING:

1. **Understand Implied Questions:**
   - If asked "Who is my girlfriend?" or "Do I have a girlfriend?", understand this is asking about CURRENT relationship status
   - Look for memories about breakups, being single, or relationship changes
   - If memories show a breakup happened, answer accordingly (e.g., "You broke up with [name] and are now single")
   - Don't just look for the exact keyword - understand the context

2. **Temporal Understanding:**
   - Questions with "yesterday", "last week", "recently" refer to recent memories
   - Questions with "when did I" or "when was" are asking for timing information
   - Use the timestamps to understand the chronological order of events
   - If a memory was updated, it represents the most current information

3. **Status Changes:**
   - If memories show a change (e.g., "was vegan" → "stopped being vegan"), answer with the CURRENT status
   - If memories show contradictions, the most recent/updated memory is the truth
   - Understand that deleted/updated memories mean the old fact is no longer true

4. **Relationship Context:**
   - Questions about relationships should consider the full context:
     * Past relationships (if mentioned)
     * Current relationship status
     * Breakups or changes in status
   - Synthesize multiple related memories to give a complete answer

5. **Answer Guidelines:**
   - Answer concisely and accurately using ONLY the memories above
   - If the memories don't contain enough information, say "I don't recall" instead of guessing
   - Be specific and reference the exact information from the memories
   - If there are multiple relevant memories, synthesize them into a coherent, chronological answer
   - For relationship questions, always clarify current status if there were changes

6. **Examples of Context-Aware Understanding:**
   - "Who is my girlfriend?" → If memories show breakup: "You broke up with [name] and are now single"
   - "Am I vegan?" → If memories show you stopped: "You stopped being vegan and are now non-vegetarian"
   - "What did I say yesterday?" → Look for memories marked "(yesterday)" or "(1 day ago)"

Answer the question using the memories above, understanding the full context and temporal relationships:`;
};

