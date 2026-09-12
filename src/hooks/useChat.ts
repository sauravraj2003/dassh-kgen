/**
 * useChat.ts — All chat logic. Uses authService (no Supabase).
 */
import { useState, useCallback } from 'react';
import { conversationService, type Message, type Conversation } from '@/lib/conversationService';
import { sendChatMessage, type HistoryMessage } from '@/lib/apiService';

export interface UseChatOptions {
  onError?: (msg: string) => void;
}

export function useChat({ onError }: UseChatOptions = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadConversations = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const list = await conversationService.getUserConversations();
      setConversations(list);
      if (list.length > 0) setCurrentConversation(list[0]);
    } catch {
      onError?.('Failed to load conversations');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [onError]);

  const createConversation = useCallback(async (title = 'New Chat') => {
    try {
      const newConv = await conversationService.createConversation(title);
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversation(newConv);
      return newConv;
    } catch {
      onError?.('Failed to create conversation');
      return null;
    }
  }, [onError]);

  const selectConversation = useCallback((conv: Conversation) => {
    setCurrentConversation(conv);
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      await conversationService.deleteConversation(conversationId);
      setConversations(prev => {
        const remaining = prev.filter(c => c.id !== conversationId);
        setCurrentConversation(cur =>
          cur?.id === conversationId ? (remaining[0] ?? null) : cur
        );
        return remaining;
      });
    } catch {
      onError?.('Failed to delete conversation');
    }
  }, [onError]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isGenerating) return;
    setIsGenerating(true);

    try {
      let conv = currentConversation;
      if (!conv) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        conv = await conversationService.createConversation(title);
        setConversations(prev => [conv!, ...prev]);
        setCurrentConversation(conv);
      }

      // Optimistic user message
      const userMsg: Message = {
        id: crypto.randomUUID(),
        content,
        role: 'user',
        timestamp: new Date(),
      };
      await conversationService.addMessage(conv.id, userMsg);
      setCurrentConversation(prev =>
        prev ? { ...prev, messages: [...prev.messages, userMsg] } : null
      );

      // Build full history including the new user message so follow-ups work.
      // conv.messages is the snapshot before this message, so append userMsg.
      const history: HistoryMessage[] = [
        ...conv.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content },
      ];
      // Send history without the last user message (backend appends prompt itself)
      const { response: aiText } = await sendChatMessage(content, history.slice(0, -1));

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        content: aiText,
        role: 'assistant',
        timestamp: new Date(),
      };
      await conversationService.addMessage(conv.id, assistantMsg);
      setCurrentConversation(prev =>
        prev ? { ...prev, messages: [...prev.messages, assistantMsg] } : null
      );

      // Auto-title on first message
      if (conv.messages.length === 0) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        await conversationService.updateConversationTitle(conv.id, title);
        setConversations(prev =>
          prev.map(c => (c.id === conv!.id ? { ...c, title } : c))
        );
      }
    } catch (err: unknown) {
      // Safely extract message from any error type
      let msg = 'AI response failed';
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'string') {
        msg = err;
      } else if (err && typeof err === 'object' && 'detail' in err) {
        msg = String((err as { detail: unknown }).detail);
      }
      onError?.(msg);
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        content: `Sorry, something went wrong. Please try again.`,
        role: 'assistant',
        timestamp: new Date(),
      };
      setCurrentConversation(prev =>
        prev ? { ...prev, messages: [...prev.messages, errorMsg] } : null
      );
    } finally {
      setIsGenerating(false);
    }
  }, [currentConversation, isGenerating, onError]);

  const addMessagePair = useCallback(async (userContent: string, assistantContent: string) => {
    try {
      let conv = currentConversation;
      if (!conv) {
        const title = userContent.slice(0, 50) + (userContent.length > 50 ? '...' : '');
        conv = await conversationService.createConversation(title);
        setConversations(prev => [conv!, ...prev]);
        setCurrentConversation(conv);
      }

      const userMsg: Message = {
        id: crypto.randomUUID(),
        content: userContent,
        role: 'user',
        timestamp: new Date(),
      };
      await conversationService.addMessage(conv.id, userMsg);

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        content: assistantContent,
        role: 'assistant',
        timestamp: new Date(),
      };
      await conversationService.addMessage(conv.id, assistantMsg);

      setCurrentConversation(prev =>
        prev ? { ...prev, messages: [...prev.messages, userMsg, assistantMsg] } : null
      );
    } catch {
      onError?.('Failed to save message history');
    }
  }, [currentConversation, onError]);

  return {
    conversations, currentConversation, isGenerating, isLoadingHistory,
    loadConversations, createConversation, selectConversation, deleteConversation, sendMessage, addMessagePair,
  };
}
