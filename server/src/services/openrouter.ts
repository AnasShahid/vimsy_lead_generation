/**
 * OpenRouter API client — replaces @openrouter/sdk which hangs on chat.send() in v0.8.0.
 * Uses direct fetch with configurable timeout, retry, and rate-limit handling.
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes
const DEFAULT_MAX_RETRIES = 1;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
  maxRetries?: number;
  /** Label shown in OpenRouter dashboard */
  appTitle?: string;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export class OpenRouterAPIError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'OpenRouterAPIError';
    this.statusCode = statusCode;
  }
}

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }
  return apiKey;
}

/**
 * Send a chat completion request to OpenRouter.
 * Handles auth, timeout, retries, error parsing, and rate-limit detection.
 */
export async function chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const {
    model,
    messages,
    temperature = 0.3,
    maxTokens,
    jsonMode = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    appTitle = 'Vimsy Lead Gen',
  } = options;

  const apiKey = getApiKey();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Lower temperature on retries for more deterministic output
      const attemptTemperature = attempt === 0 ? temperature : Math.max(0.1, temperature - 0.2);

      const body: Record<string, any> = {
        model,
        messages,
        temperature: attemptTemperature,
        stream: false,
      };

      if (jsonMode) {
        body.response_format = { type: 'json_object' };
      }
      if (maxTokens) {
        body.max_tokens = maxTokens;
      }

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vimsy.com',
          'X-Title': appTitle,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new OpenRouterAPIError(
          response.status,
          `OpenRouter API error ${response.status}: ${errorBody.slice(0, 300)}`
        );
      }

      const data: any = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        if (attempt < maxRetries) {
          continue; // retry on empty response
        }
        throw new Error(`OpenRouter returned empty content after ${maxRetries + 1} attempts`);
      }

      return {
        content,
        model: data?.model || model,
        usage: data?.usage,
      };
    } catch (err: any) {
      lastError = err;

      // Don't retry on rate limits — let caller handle backoff
      if (err instanceof OpenRouterAPIError && err.statusCode === 429) {
        throw err;
      }

      // Don't retry on timeout — it's already been long enough
      if (err.name === 'TimeoutError') {
        throw new Error(`OpenRouter request timed out after ${timeoutMs}ms`);
      }

      if (attempt >= maxRetries) {
        throw err;
      }
    }
  }

  throw lastError || new Error('OpenRouter request failed');
}
