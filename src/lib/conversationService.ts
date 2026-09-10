/**
 * conversationService.ts
 * ----------------------
 * Calls our own FastAPI /api/v1/conversations/* endpoints.
 * No Supabase. No direct DB access from browser.
 */

import { authService } from './authService';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:7700').replace(/\/$/, '');
const BASE = `${API_URL}/api/v1/conversations`;

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: Date;
  updated_at: Date;
}

async function authFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = authService.getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function toMessage(m: { id: string; role: string; content: string; created_at: string }): Message {
  return { id: m.id, role: m.role as 'user' | 'assistant', content: m.content, timestamp: new Date(m.created_at) };
}

function toConversation(c: { id: string; title: string; messages: any[]; created_at: string; updated_at: string }): Conversation {
  return {
    id: c.id,
    title: c.title,
    messages: c.messages.map(toMessage),
    created_at: new Date(c.created_at),
    updated_at: new Date(c.updated_at),
  };
}

export const conversationService = {

  async getUserConversations(): Promise<Conversation[]> {
    const data = await authFetch<any[]>(BASE);
    return data.map(toConversation);
  },

  async createConversation(title = 'New Chat'): Promise<Conversation> {
    const data = await authFetch<any>(BASE, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    return toConversation(data);
  },

  async deleteConversation(id: string): Promise<void> {
    await authFetch<void>(`${BASE}/${id}`, { method: 'DELETE' });
  },

  async updateConversationTitle(id: string, title: string): Promise<void> {
    await authFetch<void>(`${BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  },

  async addMessage(conversationId: string, message: Message): Promise<void> {
    await authFetch<void>(`${BASE}/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ id: message.id, role: message.role, content: message.content }),
    });
  },
};