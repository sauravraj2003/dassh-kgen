import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/authService';
import { useChat } from '@/hooks/useChat';
import { useGame } from '@/hooks/useGame';
import ChatSidebar from '@/components/ChatSidebar';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import GamePanel from '@/components/GamePanel';
import SettingsModal from '@/components/SettingsModal';
import { X } from 'lucide-react';

interface User { email: string; id: string; }

// Detect if the user wants to generate a brand-new game.
//
// Strategy: needs EITHER
//   (A) a creation verb  +  the word "game" anywhere, OR
//   (B) a specific named game type (snake, tetris, etc.)
//
// Pure edit phrases ("make it faster", "add enemies") are blocked
// so they go to the game editor instead when a game is already open.
function isNewGameRequest(text: string): boolean {
  const t = text.toLowerCase().trim();

  // Named game types — these alone are enough to trigger generation
  const namedGames = [
    'snake', 'tetris', 'pacman', 'pac-man', 'flappy bird', 'flappy',
    'pong', 'breakout', 'space invader', 'asteroids', 'dino runner',
    'dino game', 'brick breaker', 'bubble shooter', 'minesweeper',
    'sudoku', 'chess game', 'checkers', 'tic tac toe', 'tictactoe',
    'tower defense', 'platformer', 'endless runner', 'side scroller',
    'top-down shooter', 'bullet hell', 'clicker game', 'idle game',
    'match-3', 'candy crush', 'angry birds', 'fruit ninja',
    'whack-a-mole', 'typing game', '2048', 'wordle', 'dungeon',
  ];
  if (namedGames.some(g => t.includes(g))) return true;

  // Creation verbs
  const creationVerbs = [
    'make', 'create', 'build', 'generate', 'code', 'write',
    'develop', 'design', 'give me', 'i want', 'i need', 'show me',
    'can you make', 'can you build', 'can you create',
  ];
  const hasCreationVerb = creationVerbs.some(v => t.includes(v));

  // Game nouns/types
  const gameNouns = [
    'game', 'arcade', 'shooter', 'runner', 'platformer', 'puzzle',
    'racing', 'driving', 'fighting', 'adventure', 'rpg', 'simulation',
    'strategy', 'sport', 'cricket', 'football', 'basketball',
  ];
  const hasGameNoun = gameNouns.some(n => t.includes(n));

  return hasCreationVerb && hasGameNoun;
}


const ChatInterface = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chat = useChat({
    onError: (msg) => toast({ title: 'Error', description: msg, variant: 'destructive' }),
  });

  const game = useGame({
    onSuccess: (title, html, prompt) => {
      toast({ title: '🎮 Game ready!', description: `"${title}" is live — play it on the right!`, duration: 2000 });
      // Record this interaction in the chat history so it shows up in the UI
      const lines = html.split('\n').length;
      chat.addMessagePair(
        prompt,
        `✅ Game code generated successfully. Use the game panel on the right to play it.\n\n\`\`\`html\n${html}\n\`\`\``
      );
    },
    onError: (msg) => toast({ title: 'Game generation failed', description: msg, variant: 'destructive' }),
  });

  const [showGamePanel, setShowGamePanel] = useState(false);

  // Auth — restore session from refresh cookie
  useEffect(() => {
    const unsub = authService.onAuthStateChange((authUser) => {
      if (authUser) {
        setUser({ email: authUser.email, id: authUser.user_id });
        setAuthLoading(false);
      } else if (!authLoading) {
        navigate('/');
      }
    });

    authService.restoreSession().then(u => {
      if (!u) navigate('/');
      setAuthLoading(false);
    });

    return unsub;
  }, [navigate]);

  // Load conversations once authenticated
  useEffect(() => {
    if (user?.id) chat.loadConversations();
  }, [user?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.currentConversation?.messages]);

  // Show game panel automatically when a game finishes generating
  useEffect(() => {
    if (game.game) setShowGamePanel(true);
  }, [game.game]);

  const handleLogout = async () => {
    try { await authService.logout(); navigate('/'); }
    catch { toast({ title: 'Logout failed', variant: 'destructive' }); }
  };

  // Hide panel but keep game in memory so it can be reopened
  const handleHideGamePanel = () => setShowGamePanel(false);

  // Fully discard the game and close the panel
  const handleCloseGamePanel = () => {
    setShowGamePanel(false);
    game.clear();
  };

  /** Smart send:
   * - Game panel open + game loaded → edit the live game directly
   * - Game panel open but still generating → queue/wait
   * - New game keyword → generate a new game
   * - Everything else → regular chat
   */
  const gameIsActive = showGamePanel && !!game.game;
  // Game exists in memory but panel is hidden — show re-open button
  const gameIsHidden = !showGamePanel && !!game.game;

  const handleSendMessage = async (content: string) => {
    // Check if user has an API key configured before processing
    const keysStr = localStorage.getItem('dassh_api_keys');
    let hasKey = false;
    if (keysStr) {
      try {
        const keys = JSON.parse(keysStr);
        hasKey = Boolean(keys.groq || keys.gemini || keys.openai);
      } catch (e) {}
    }
    
    if (!hasKey) {
      toast({ 
        title: 'API Key Required', 
        description: 'Please add your LLM API key in Settings to continue.',
        variant: 'destructive' 
      });
      setIsSettingsOpen(true);
      return;
    }

    if (gameIsActive) {
      // Directly edit the live game — no text response
      game.editGame(content);
    } else if (isNewGameRequest(content)) {
      game.generate(content);
    } else {
      chat.sendMessage(content);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyber-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyber-accent mx-auto mb-4" />
          <p className="text-cyber-text">Loading DASSH...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-cyber-dark overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        user={user}
        conversations={chat.conversations}
        currentConversation={chat.currentConversation}
        onNewConversation={() => chat.createConversation()}
        onSelectConversation={chat.selectConversation}
        onDeleteConversation={chat.deleteConversation}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto">
          <ChatMessages
            messages={chat.currentConversation?.messages ?? []}
            isGenerating={chat.isGenerating || game.isGenerating}
          />
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t border-cyber-border bg-cyber-card">
          {/* Game Edit Mode banner — shown when a game is active */}
          {gameIsActive && !game.isGenerating && (
            <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border-b border-cyan-500/20">
              <span className="text-lg">✏️</span>
              <span className="text-xs text-cyan-300 font-medium">Game Edit Mode — your message will directly update the live game</span>
              <button
                onClick={handleHideGamePanel}
                className="ml-auto text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Hide panel
              </button>
            </div>
          )}
          {/* Building banner */}
          {game.isGenerating && (
            <div className="flex items-center gap-2 px-4 py-2 bg-arcade-purple/10 border-b border-arcade-purple/20 text-xs text-purple-300">
              <div className="w-3 h-3 border-2 border-purple-400/40 border-t-purple-400 rounded-full animate-spin" />
              {game.game ? 'Updating your game…' : 'Building your game — live preview will appear on the right…'}
            </div>
          )}
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={chat.isGenerating || game.isGenerating}
            placeholder={gameIsActive ? 'Edit the game (e.g. "make the snake faster", "add a score multiplier")…' : undefined}
          />
          {!gameIsActive && (
            <p className="text-center text-xs text-cyber-muted pb-2">
              Tip: say <span className="text-purple-400">"make a snake game"</span> to generate a playable game live ✨
            </p>
          )}
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      {/* Floating re-open button — appears when game is loaded but panel is hidden */}
      {gameIsHidden && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2">
          {/* Open button */}
          <button
            onClick={() => setShowGamePanel(true)}
            className="group flex items-center gap-3 bg-gray-900 hover:bg-gray-800 border border-purple-500/50 hover:border-purple-400 text-white rounded-2xl pl-4 pr-5 py-3 shadow-2xl shadow-purple-900/40 transition-all duration-200 hover:scale-105"
          >
            <span className="text-2xl group-hover:animate-bounce">🎮</span>
            <div className="text-left">
              <div className="text-xs text-purple-400 font-semibold uppercase tracking-wide">Resume Game</div>
              <div className="text-sm text-white font-medium truncate max-w-[160px]">{game.game?.title}</div>
            </div>
          </button>
          {/* Discard game button */}
          <button
            onClick={handleCloseGamePanel}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2"
          >
            Discard game
          </button>
        </div>
      )}
      {/* Game panel — slides in on the right */}
      {(showGamePanel || game.isGenerating) && (
        <div className="w-[520px] shrink-0 flex flex-col h-full border-l border-cyber-border relative">
          {/* Hide button — just hides panel, keeps game in memory */}
          <button
            onClick={handleHideGamePanel}
            title="Hide game panel (game stays in memory)"
            className="absolute top-2 right-2 z-10 p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={14} />
          </button>

          {game.game ? (
            <GamePanel
              html={game.game.html}
              title={game.game.title}
              onClose={handleHideGamePanel}
              isGenerating={game.isGenerating}
              onEditGame={game.editGame}
            />
          ) : game.isGenerating ? (
            /* Initial loading state — no game yet */
            <div className="flex-1 flex flex-col items-center justify-center bg-black gap-5">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-3xl">🎮</div>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-lg mb-1">Building your game…</p>
                <p className="text-gray-400 text-sm">AI is writing the code. Usually 15–30 seconds.</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.12}s` }} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
