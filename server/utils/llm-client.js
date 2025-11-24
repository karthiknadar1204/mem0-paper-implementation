import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import defaultOpenAI from './openai.js';

const SUPPORTED_PROVIDERS = ['openai', 'gemini'];
const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-pro',
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
    return new GoogleGenerativeAI(apiKey);
  }

  if (apiKey) {
    return new OpenAI({ apiKey });
  }

  return defaultOpenAI;
};

export const buildLLMContext = ({ provider, apiKey, model }) => {
  const normalizedProvider = normalizeProvider(provider);
  const resolvedModel = model || DEFAULT_MODELS[normalizedProvider];
  const client = createClient(normalizedProvider, apiKey);

  return {
    provider: normalizedProvider,
    model: resolvedModel,
    client,
  };
};

const mapMessagesToGemini = (messages) => {
  return messages.map((msg) => ({
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
    const model = context.client.getGenerativeModel({ model: context.model });
    const generationConfig = {};

    if (typeof temperature === 'number') {
      generationConfig.temperature = temperature;
    }

    if (typeof maxTokens === 'number') {
      generationConfig.maxOutputTokens = maxTokens;
    }

    if (responseFormat?.type === 'json_object') {
      generationConfig.responseMimeType = 'application/json';
    }

    const result = await model.generateContent({
      contents: mapMessagesToGemini(messages),
      ...(Object.keys(generationConfig).length > 0 ? { generationConfig } : {}),
    });

    const text = result?.response?.text?.();

    if (!text) {
      throw new LLMError('Gemini returned an empty response.', 500);
    }

    return text.trim();
  } catch (error) {
    const message = error?.message || '';
    if (message.toLowerCase().includes('api key') || error?.status === 401 || error?.status === 403) {
      throw new LLMError('Invalid Gemini API key. Please double-check your key and try again.', 401, error);
    }

    throw new LLMError('Gemini request failed.', 500, error);
  }
};

export const runChatCompletion = async ({ context, messages, temperature, maxTokens, responseFormat }) => {
  if (context.provider === 'gemini') {
    return runGeminiCompletion({ context, messages, temperature, maxTokens, responseFormat });
  }

  return runOpenAICompletion({ context, messages, temperature, maxTokens, responseFormat });
};

