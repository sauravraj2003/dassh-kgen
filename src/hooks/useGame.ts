/**
 * useGame.ts
 * ----------
 * Custom hook for game generation and iframe sandbox management.
 * Uses a ref to avoid stale closure when passing current html for edits.
 */

import { useState, useCallback, useRef } from 'react';
import { generateGame } from '@/lib/apiService';

export interface GameState {
  html: string;
  title: string;
  prompt: string;
}

export interface UseGameOptions {
  onError?: (msg: string) => void;
  onSuccess?: (title: string, html: string, prompt: string) => void;
}

export function useGame({ onError, onSuccess }: UseGameOptions = {}) {
  const [game, setGame] = useState<GameState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Ref always holds the latest game so edit callbacks don't get stale html
  const gameRef = useRef<GameState | null>(null);

  const generate = useCallback(async (prompt: string, category = '', previousHtml = '') => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);

    // If editing (previousHtml provided), keep the game visible while regenerating
    if (!previousHtml) {
      setGame(null);
      gameRef.current = null;
    }

    try {
      const result = await generateGame(prompt, category, previousHtml);
      const newGame = { html: result.html, title: result.title, prompt };
      setGame(newGame);
      gameRef.current = newGame;
      setIframeKey((k) => k + 1);
      onSuccess?.(result.title, result.html, prompt);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Game generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, onError, onSuccess]);

  /** Edit the current game with a follow-up prompt — always uses latest html via ref */
  const editGame = useCallback((editPrompt: string) => {
    const currentHtml = gameRef.current?.html ?? '';
    generate(editPrompt, '', currentHtml);
  }, [generate]);

  /** Force-restart the game by remounting the iframe */
  const restart = useCallback(() => setIframeKey((k) => k + 1), []);

  /** Clear game state */
  const clear = useCallback(() => {
    setGame(null);
    gameRef.current = null;
    setIframeKey(0);
  }, []);

  return { game, isGenerating, iframeKey, generate, editGame, restart, clear };
}
