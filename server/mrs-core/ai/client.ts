/**
 * MRS Core — Shared Server-Side Gemini Client & Model Utility
 * Uses @google/genai SDK with strict server-only GEMINI_API_KEY isolation
 * and the active gemini-4-hydrogen model family.
 */

import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

export const GEMINI_DEFAULT_MODEL = 'gemini-4-hydrogen';

const LEGACY_MODEL_PATTERN = /^(gemini-(1\.|2\.0)|gemini-pro)/i;

export function resolveGeminiModel(requested?: string): string {
  const candidate = String(requested || process.env.MRS_GEMINI_MODEL || '').trim();
  if (!candidate || LEGACY_MODEL_PATTERN.test(candidate)) {
    return GEMINI_DEFAULT_MODEL;
  }
  return candidate;
}

export function createGeminiClient(apiKey = process.env.GEMINI_API_KEY || ''): GoogleGenAI | null {
  const cleanKey = String(apiKey || '').trim();
  if (!cleanKey || cleanKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: cleanKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function generateWithRetry(
  ai: GoogleGenAI,
  params: Omit<GenerateContentParameters, 'model'> & { model?: string },
  maxRetries = 2
): Promise<GenerateContentResponse> {
  const model = resolveGeminiModel(params.model);
  let lastErr: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent({
        ...params,
        model,
      });
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || '');
      const status = Number(err?.status || err?.code || 0);
      const retryable = status === 429 || status === 503 || status === 500 || /RESOURCE_EXHAUSTED|UNAVAILABLE|timeout/i.test(msg);
      if (!retryable || attempt === maxRetries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 350 * Math.pow(2, attempt)));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('Gemini API request failed');
}
