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

