/**
 * apiService.ts — Calls FastAPI backend (/api/v1/).
 * Gets JWT from authService (in-memory). No Supabase.
 */

import { authService } from './authService';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:7700').replace(/\/$/, '');
const API_BASE = `${API_URL}/api/v1`;

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
}

export interface GameGenerateResponse {
  html: string;
  title: string;
  prompt: string;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = authService.getAccessToken();
  if (!token) throw new Error('Not authenticated — please log in');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  
  // Attach user-provided LLM API keys
  const keysStr = localStorage.getItem('dassh_api_keys');
  let apiKeysHeaders: Record<string, string> = {};
  if (keysStr) {
    try {
      const keys = JSON.parse(keysStr);
      if (keys.groq) apiKeysHeaders['x-groq-api-key'] = keys.groq;
      if (keys.gemini) apiKeysHeaders['x-gemini-api-key'] = keys.gemini;
      if (keys.openai) apiKeysHeaders['x-openai-api-key'] = keys.openai;
    } catch (e) {
      // ignore JSON parse error
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...headers, ...apiKeysHeaders, ...(options.headers ?? {}) },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail ?? `API error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/** POST /api/v1/chat */
export async function sendChatMessage(prompt: string, history: HistoryMessage[]): Promise<ChatResponse> {
  return apiFetch<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ prompt, history }),
  });
}

/** POST /api/v1/game/generate */
export async function generateGame(prompt: string, category = '', previous_html = ''): Promise<GameGenerateResponse> {
  return apiFetch<GameGenerateResponse>('/game/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, category, previous_html }),
  });
}

/** GET /health (no auth) */
export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_URL}/health`);
  return response.json();
}
