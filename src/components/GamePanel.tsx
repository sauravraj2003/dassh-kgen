/**
 * GamePanel.tsx
 * -------------
 * A slide-in split-screen panel that shows the AI-generated game live.
 * Works like Lovable's preview pane — game runs in a sandboxed iframe
 * on the right while chat stays on the left.
 */

import { useState, useCallback } from 'react';
import { X, RefreshCw, Maximize2, Code, Copy, Check, Gamepad2, Minimize2 } from 'lucide-react';

interface GamePanelProps {
  html: string;
  title: string;
  onClose: () => void;
  isGenerating?: boolean;
  onEditGame: (prompt: string) => void;
}

export default function GamePanel({ html, title, onClose, isGenerating = false, onEditGame }: GamePanelProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const restart = useCallback(() => setIframeKey(k => k + 1), []);

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [html]);

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col bg-black'
          : 'flex flex-col h-full border-l border-cyber-border bg-black'
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">🎮</span>
          <span className="text-white text-sm font-medium truncate max-w-[160px]">{title || 'Game Preview'}</span>
          <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded font-mono">LIVE</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowCode(s => !s)}
            title={showCode ? 'Show game' : 'View code'}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors"
          >
            <Code size={11} />
            {showCode ? 'Play' : 'Code'}
          </button>
          <button
            onClick={restart}
            title="Restart"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setIsFullscreen(f => !f)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 relative overflow-hidden">
        {showCode ? (
          /* Code view */
          <div className="h-full overflow-auto p-3 bg-gray-950">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-mono">
                game.html · {html.length.toLocaleString()} chars
              </span>
              <button
                onClick={copyCode}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs text-green-400 font-mono leading-relaxed whitespace-pre-wrap break-all">
              {html}
            </pre>
          </div>
        ) : (
          /* Live game iframe */
          <iframe
            key={iframeKey}
            srcDoc={html}
            sandbox="allow-scripts"
            title={title || 'Generated Game'}
            className="w-full h-full border-0 block"
            style={{ background: '#111' }}
            aria-label={`Playable game: ${title}`}
          />
        )}

        {/* Controls overlay (only in game view) */}
        {!showCode && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/70 backdrop-blur px-3 py-1.5 rounded-full pointer-events-none">
            <span className="text-gray-400 text-xs">Click game to focus · Arrow keys / WASD · Space · R to restart</span>
          </div>
        )}
      </div>

      {/* Edit Game Input Bar */}
      <div className="p-3 bg-gray-900 border-t border-gray-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = new FormData(e.currentTarget).get('editPrompt') as string;
            if (input.trim() && !isGenerating) {
              onEditGame(input);
              e.currentTarget.reset();
            }
          }}
          className="relative"
        >
          <input
            name="editPrompt"
            type="text"
            placeholder="Edit this game (e.g. 'make the snake faster', 'add enemies')..."
            disabled={isGenerating}
            className="w-full bg-black/50 border border-gray-700 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 transition-all"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isGenerating}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
