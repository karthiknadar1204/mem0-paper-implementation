import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import defaultOpenAI from './openai.js';

const SUPPORTED_PROVIDERS = ['openai', 'gemini'];

const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-pro-latest',
};

const GEMINI_MODEL_ALIASES = {
  'gemini-2.5-flash': 'gemini-2.5-flash',
  'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
  'gemini-1.5-pro': 'gemini-1.5-pro-latest',
  'gemini-1.5-pro-001': 'gemini-1.5-pro-latest',
  'gemini-1.5-pro-latest': 'gemini-1.5-pro-latest',
  'gemini-1.5-flash': 'gemini-1.5-flash-latest',
  'gemini-1.5-flash-001': 'gemini-1.5-flash-latest',
  'gemini-1.5-flash-latest': 'gemini-1.5-flash-latest',
  'gemini-1.0-pro': 'gemini-1.0-pro',
  'gemini-1.0-pro-latest': 'gemini-1.0-pro',
  'gemini-pro': 'gemini-pro',
  'gemini-pro-1.0': 'gemini-pro',
};

const normalizeGeminiModel = (model) => {
  if (!model || typeof model !== 'string') {
    return DEFAULT_MODELS.gemini;
  }

  const normalized = model.trim().toLowerCase();
  return GEMINI_MODEL_ALIASES[normalized] || model;
};

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
    return 'openai';
  }

  const normalized = provider.toLowerCase();
  return SUPPORTED_PROVIDERS.includes(normalized) ? normalized : 'openai';
};

export const resolveLLMRequest = (body = {}) => {
  const provider = normalizeProvider(body.llmProvider);
  const model = body.llmModel || body.model;
  const apiKey = typeof body.llmApiKey === 'string' ? body.llmApiKey.trim() : undefined;

  return {
    provider,
    model: model && typeof model === 'string' ? model : undefined,
    apiKey: apiKey && apiKey.length > 0 ? apiKey : undefined,
  };
};

const createClient = (provider, apiKey) => {
  if (provider === 'gemini') {
    if (!apiKey) {
      throw new LLMError('Gemini API key is required when using the Gemini provider.', 400);
    }
    return new GoogleGenAI({ apiKey });
  }

  if (apiKey) {
    return new OpenAI({ apiKey });
  }

  return defaultOpenAI;
};

export const buildLLMContext = ({ provider, apiKey, model }) => {
  const normalizedProvider = normalizeProvider(provider);
  const resolvedModel =
    normalizedProvider === 'gemini'
      ? normalizeGeminiModel(model)
      : (model || DEFAULT_MODELS[normalizedProvider]);
  const client = createClient(normalizedProvider, apiKey);

  return {
    provider: normalizedProvider,
    model: resolvedModel,
    client,
  };
};

const mapMessagesToGeminiContents = (messages) => {
  // Convert OpenAI-style messages to Gemini format
  // Gemini expects an array of { role: 'user'|'model', parts: [{ text: '...' }] }
  return messages
    .filter(msg => msg.role !== 'system') // System messages are handled separately
    .map((msg) => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      return {
        role,
        parts: [{ text: msg.content }],
      };
    });
};

const runOpenAICompletion = async ({ context, messages, temperature, maxTokens, responseFormat }) => {
  try {
    const completion = await context.client.chat.completions.create({
      model: context.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(responseFormat ? { response_format: responseFormat } : {}),
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      throw new LLMError('Invalid OpenAI API key. Please double-check your key and try again.', 401, error);
    }

    throw new LLMError('OpenAI request failed.', 500, error);
  }
};

const runGeminiCompletion = async ({ context, messages, temperature, maxTokens, responseFormat }) => {
  try {
    // Extract system message if present
    const systemMessage = messages.find(msg => msg.role === 'system');
    const chatMessages = messages.filter(msg => msg.role !== 'system');
    
    // Convert messages to Gemini format
    const contents = mapMessagesToGeminiContents(chatMessages);
    
    // Build config object
    const config = {};
    
    if (typeof temperature === 'number') {
      config.temperature = temperature;
    }

    if (typeof maxTokens === 'number') {
      config.maxOutputTokens = maxTokens;
    }

    if (responseFormat?.type === 'json_object') {
      config.responseMimeType = 'application/json';
    }

    // Use the new API syntax: ai.models.generateContent({ model, contents, config })
    const response = await context.client.models.generateContent({
      model: context.model,
      contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: '' }] }],
      ...(systemMessage ? { systemInstruction: systemMessage.content } : {}),
      ...(Object.keys(config).length > 0 ? { config } : {}),
    });

    const text = response?.text;

    if (!text) {
      throw new LLMError('Gemini returned an empty response.', 500);
    }

    return text.trim();
  } catch (error) {
    const message = error?.message || '';
    if (message.toLowerCase().includes('api key') || error?.status === 401 || error?.status === 403) {
      throw new LLMError('Invalid Gemini API key. Please double-check your key and try again.', 401, error);
    }

    const errorMessage = typeof message === 'string' && message.length > 0
      ? `Gemini request failed: ${message}`
      : 'Gemini request failed.';

    throw new LLMError(errorMessage, 500, error);
  }
};

export const runChatCompletion = async ({ context, messages, temperature, maxTokens, responseFormat }) => {
  if (context.provider === 'gemini') {
    return runGeminiCompletion({ context, messages, temperature, maxTokens, responseFormat });
  }

  return runOpenAICompletion({ context, messages, temperature, maxTokens, responseFormat });
};

