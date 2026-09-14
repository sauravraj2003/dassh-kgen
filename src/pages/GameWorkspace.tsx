/**
 * GameWorkspace.tsx
 * -----------------
 * Renders AI-generated games in a sandboxed browser iframe.
 *
 * SANDBOX APPROACH (100% free, built into all browsers):
 *   <iframe srcdoc={html} sandbox="allow-scripts">
 *
 * sandbox="allow-scripts" means:
 *   ✅ JavaScript can run (needed for the game)
 *   🚫 No access to parent page DOM
 *   🚫 No cookies or localStorage from parent origin
 *   🚫 No form submissions or popups
 *   🚫 No external network requests (no CDN, no tracking)
 *
 * This is exactly what we need — simple canvas games run perfectly in it.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useGame } from '@/hooks/useGame';
import { ArrowLeft, Code, Share, Maximize2, RefreshCw, Send, X, Copy, Check, Gamepad2 } from 'lucide-react';

interface LocationState {
  prompt?: string;
  category?: string;
}

const GameWorkspace = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const state = location.state as LocationState | null;

  const [inputPrompt, setInputPrompt] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { game, isGenerating, iframeKey, generate, restart } = useGame({
    onSuccess: (title) => toast({ title: '🎮 Game ready!', description: title, duration: 2000 }),
    onError: (msg) => toast({ title: 'Generation failed', description: msg, variant: 'destructive' }),
  });

  // Auto-generate if we came from CreateGame with a prompt
  useEffect(() => {
    if (state?.prompt) {
      generate(state.prompt, state.category ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = () => {
    if (!inputPrompt.trim()) return;
    generate(inputPrompt.trim());
    setInputPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleCopyCode = async () => {
    if (!game?.html) return;
    await navigator.clipboard.writeText(game.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Sub-components ─────────────────────────────────────────────────────────

  const LoadingState = () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black/50 gap-5">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-arcade-purple/30 border-t-arcade-purple rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">🎮</div>
      </div>
      <div className="text-center max-w-xs">
        <p className="text-white font-semibold text-lg mb-1">Building your game…</p>
        <p className="text-gray-400 text-sm">AI is writing the code. Usually 15–30 seconds.</p>
      </div>
      <div className="flex gap-1.5 mt-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-2 h-2 bg-arcade-purple rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black/20 gap-4">
      <Gamepad2 size={56} className="text-gray-600" />
      <div className="text-center">
        <p className="text-gray-300 font-medium text-lg">Your game will appear here</p>
        <p className="text-gray-500 text-sm mt-1">Type a game idea on the left and hit Generate</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-sm">
        {['Flappy Bird clone', 'Snake game', 'Breakout / Arkanoid', 'Space Invaders', 'Pong'].map((idea) => (
          <button
            key={idea}
            onClick={() => generate(idea)}
            className="px-3 py-1 text-xs bg-arcade-purple/20 border border-arcade-purple/40 text-gray-300 rounded-full hover:bg-arcade-purple/30 transition-colors"
          >
            {idea}
          </button>
        ))}
      </div>
    </div>
  );

  const GameIframe = () => (
    <iframe
      key={iframeKey}
      srcDoc={game!.html}
      // sandbox="allow-scripts" — games need JS but nothing else.
      // No allow-same-origin so iframe can't reach parent DOM.
      // No allow-forms, allow-popups — keeps it secure and self-contained.
      sandbox="allow-scripts"
      title={game!.title || 'Generated Game'}
      className="w-full h-full border-0 block"
      style={{ background: '#111' }}
      aria-label={`Playable game: ${game!.title}`}
    />
  );

  return (
    <div className={`flex flex-col bg-arcade-dark ${isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'}`}>

      {/* ── Header ── */}
      <header className="bg-black/80 border-b border-gray-800 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {!isFullscreen && (
            <button onClick={() => navigate('/create-game')}
              className="text-gray-400 hover:text-white flex items-center gap-1 text-sm transition-colors">
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-arcade-purple rounded flex items-center justify-center text-xs">🎮</div>
            <span className="text-white font-medium text-sm truncate max-w-[200px]">
              {game?.title || 'Game Workspace'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {game && (
            <>
              <button onClick={() => setShowCode(!showCode)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors">
                <Code size={13} />
                {showCode ? 'Hide Code' : 'View Code'}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: 'Link copied!' }); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-white bg-arcade-purple hover:bg-opacity-90 rounded transition-opacity">
                <Share size={13} /> Share
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Panel ── */}
        {!isFullscreen && (
          <div className="w-[340px] shrink-0 flex flex-col bg-gray-900 border-r border-gray-800">

            {/* Current game badge */}
            {game?.prompt && (
              <div className="mx-3 mt-3 px-3 py-2 bg-arcade-purple/10 border border-arcade-purple/25 rounded-lg">
                <p className="text-xs text-gray-500 mb-0.5 font-medium uppercase tracking-wide">Current Game</p>
                <p className="text-white text-sm leading-snug line-clamp-2">{game.prompt}</p>
              </div>
            )}

            {/* Status / code viewer area */}
            <div className="flex-1 overflow-y-auto p-3">
              {showCode && game?.html ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-mono">game.html · {game.html.length.toLocaleString()} chars</span>
                    <button onClick={handleCopyCode}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="text-xs text-green-400 bg-black/60 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-[55vh] overflow-y-auto">
                    {game.html}
                  </pre>
                </div>
              ) : (
                <div className="bg-black/25 rounded-lg p-4">
                  {isGenerating ? (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-arcade-purple/30 border-t-arcade-purple rounded-full animate-spin shrink-0" />
                      <div>
                        <p className="text-white text-sm font-medium">Generating game code…</p>
                        <p className="text-gray-500 text-xs mt-0.5">This usually takes 15–30 seconds</p>
                      </div>
                    </div>
                  ) : game ? (
                    <div>
                      <p className="text-green-400 text-sm font-medium mb-2">✅ Game ready to play!</p>
                      <ul className="text-gray-400 text-xs space-y-1">
                        <li>🎮 Click the game to focus it</li>
                        <li>⌨️ Use Arrow keys / WASD to control</li>
                        <li>Space to jump/shoot</li>
                        <li>R to restart after game over</li>
                      </ul>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-300 text-sm font-medium mb-1">How it works</p>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        Describe any simple arcade game below and the AI will write complete
                        playable HTML5 canvas code — no plugins, no downloads needed.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Prompt input */}
            <div className="p-3 border-t border-gray-800">
              <div className="relative">
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe a game (e.g. 'flappy bird')…"
                  disabled={isGenerating}
                  maxLength={1000}
                  className="w-full bg-black/40 text-white rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-arcade-purple disabled:opacity-50 placeholder:text-gray-600"
                />
                <button
                  onClick={handleSubmit}
                  disabled={isGenerating || !inputPrompt.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-arcade-purple p-1.5 rounded text-white disabled:opacity-30 transition-opacity hover:bg-opacity-80"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Right Panel — Sandboxed Game Iframe ── */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {isGenerating ? <LoadingState /> : game ? <GameIframe /> : <EmptyState />}

          {/* Overlay controls */}
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="bg-black/70 hover:bg-black/90 backdrop-blur p-1.5 rounded text-white transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <X size={14} /> : <Maximize2 size={14} />}
            </button>
            {game && (
              <button
                onClick={restart}
                className="bg-black/70 hover:bg-black/90 backdrop-blur p-1.5 rounded text-white transition-colors"
                title="Restart game"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameWorkspace;
