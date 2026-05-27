import OpenAI from 'openai';

const SUPPORTED_PROVIDERS = ['openai'];

const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
};

const EMBEDDING_MODEL = 'text-embedding-3-small';

export class LLMError extends Error {
  constructor(message, statusCode = 500, cause = null) {
    super(message);
    this.name = 'LLMError';
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

const normalizeProvider = (provider) => {
  if (!provider || typeof provider !== 'string') {
    throw new LLMError('llmProvider is required and must be "openai".', 400);
  }

  const normalized = provider.trim().toLowerCase();

  if (normalized === 'gemini') {
    throw new LLMError('Gemini support is temporarily disabled. Pass llmProvider: "openai" with an OpenAI API key.', 400);
  }

  if (!SUPPORTED_PROVIDERS.includes(normalized)) {
    throw new LLMError('Invalid llmProvider. Only "openai" is currently supported.', 400);
  }

  return normalized;
};

export const resolveLLMRequest = (body = {}) => {
  const provider = normalizeProvider(body.llmProvider);
  const model = body.llmModel || body.model;
  const apiKey = typeof body.llmApiKey === 'string' ? body.llmApiKey.trim() : undefined;

  if (!apiKey || apiKey.length === 0) {
    throw new LLMError('llmApiKey is required. The server does not use any LLM credentials of its own.', 400);
  }

  return {
    provider,
    model: (model && typeof model === 'string') ? model : undefined,
    apiKey,
  };
};

export const resolveEmbeddingsApiKey = (body = {}) => {
  const explicit = typeof body.embeddingApiKey === 'string' ? body.embeddingApiKey.trim() : '';
  if (explicit.length > 0) return explicit;

  const provider = typeof body.llmProvider === 'string' ? body.llmProvider.trim().toLowerCase() : '';
  const llmKey = typeof body.llmApiKey === 'string' ? body.llmApiKey.trim() : '';
  if (provider === 'openai' && llmKey.length > 0) return llmKey;

  throw new LLMError(
    'An OpenAI API key is required for embeddings. Pass it as llmApiKey (with llmProvider: "openai") or embeddingApiKey.',
    400
  );
};

const createClient = (provider, apiKey) => {
  if (!apiKey) {
    throw new LLMError('OpenAI API key is required for this request.', 400);
  }
  return new OpenAI({ apiKey });
};

export const buildLLMContext = ({ provider, apiKey, model }) => {
  const normalizedProvider = normalizeProvider(provider);
  const resolvedModel = model || DEFAULT_MODELS[normalizedProvider];
  const client = createClient(normalizedProvider, apiKey);

  return {
    provider: normalizedProvider,
    model: resolvedModel,
    client,
    apiKey,
  };
};

const wrapOpenAIError = (error, fallbackMessage) => {
  const message = (error?.message || '').toLowerCase();
  const isAuthError =
    error?.status === 401 ||
    error?.status === 403 ||
    message.includes('authentication') ||
    message.includes('api key');

  if (isAuthError) {
    return new LLMError('Invalid OpenAI API key. Please double-check your key and try again.', 401, error);
  }
  return new LLMError(fallbackMessage, 500, error);
};

export const runChatCompletionRaw = async ({ context, messages, temperature, maxTokens, responseFormat, tools, toolChoice }) => {
  try {
    const completion = await context.client.chat.completions.create({
      model: context.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(responseFormat ? { response_format: responseFormat } : {}),
      ...(tools ? { tools } : {}),
      ...(toolChoice ? { tool_choice: toolChoice } : {}),
    });

    return completion.choices[0].message;
  } catch (error) {
    throw wrapOpenAIError(error, 'OpenAI request failed.');
  }
};

export const runChatCompletion = async (opts) => {
  const message = await runChatCompletionRaw(opts);
  return (message?.content || '').trim();
};

export const embedText = async (text, apiKey) => {
  if (!apiKey) {
    throw new LLMError('OpenAI API key is required for embeddings.', 400);
  }

  const client = new OpenAI({ apiKey });
  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    throw wrapOpenAIError(error, 'OpenAI embeddings request failed.');
  }
};

