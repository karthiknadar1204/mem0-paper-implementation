import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import defaultOpenAI from './openai.js';

const SUPPORTED_PROVIDERS = ['openai', 'gemini'];

const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
};

const normalizeGeminiModel = (model) => {
  return (model && typeof model === 'string') ? model.trim() : DEFAULT_MODELS.gemini;
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
    model: (model && typeof model === 'string') ? model : undefined,
    apiKey: (apiKey && apiKey.length > 0) ? apiKey : undefined,
  };
};

const createClient = (provider, apiKey) => {
  if (provider === 'gemini') {
    if (!apiKey) {
      throw new LLMError('Gemini API key is required when using the Gemini provider.', 400);
    }
    return new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
  }

  if (apiKey) {
    return new OpenAI({ apiKey });
  }

  return defaultOpenAI;
};

export const buildLLMContext = ({ provider, apiKey, model }) => {
  const normalizedProvider = normalizeProvider(provider);
  const resolvedModel = normalizedProvider === 'gemini'
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
  return messages
    .filter(msg => msg.role !== 'system')
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
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
    
    // Build config object with conditional properties
    const config = {
      ...(typeof temperature === 'number' && { temperature }),
      ...(typeof maxTokens === 'number' && { maxOutputTokens: maxTokens }),
      ...(responseFormat?.type === 'json_object' && { responseMimeType: 'application/json' }),
    };

    // Use the new API syntax: ai.models.generateContent({ model, contents, config })
    const response = await context.client.models.generateContent({
      model: context.model,
      contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: '' }] }],
      ...(systemMessage && { systemInstruction: systemMessage.content }),
      ...(Object.keys(config).length > 0 && { config }),
    });

    const text = response?.text;

    if (!text) {
      throw new LLMError('Gemini returned an empty response.', 500);
    }

    return text.trim();
  } catch (error) {
    const message = error?.message || '';
    const isAuthError = message.toLowerCase().includes('api key') || error?.status === 401 || error?.status === 403;
    
    if (isAuthError) {
      throw new LLMError('Invalid Gemini API key. Please double-check your key and try again.', 401, error);
    }

    const errorMessage = message ? `Gemini request failed: ${message}` : 'Gemini request failed.';
    throw new LLMError(errorMessage, 500, error);
  }
};

export const runChatCompletion = async ({ context, messages, temperature, maxTokens, responseFormat }) => {
  if (context.provider === 'gemini') {
    return runGeminiCompletion({ context, messages, temperature, maxTokens, responseFormat });
  }

  return runOpenAICompletion({ context, messages, temperature, maxTokens, responseFormat });
};

