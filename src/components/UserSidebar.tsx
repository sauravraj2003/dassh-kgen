
import { useState } from 'react';
import { X, User, History, Gamepad2, LogOut, ChevronRight } from 'lucide-react';

interface User {
  email: string;
  id: string;
}

interface UserSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
}

interface Query {
  id: string;
  prompt: string;
  timestamp: Date;
}

interface Game {
  id: string;
  name: string;
  description: string;
  timestamp: Date;
}

const UserSidebar = ({ isOpen, onClose, user, onLogout }: UserSidebarProps) => {
  const [activeSection, setActiveSection] = useState<'queries' | 'games'>('queries');

  // Mock data for demo
  const mockQueries: Query[] = [
    {
      id: '1',
      prompt: 'Create a space shooter with neon graphics',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: '2',
      prompt: 'Make a puzzle game with cyberpunk theme',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
      id: '3',
      prompt: 'Build a platformer with retro aesthetics',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
  ];

  const mockGames: Game[] = [
    {
      id: '1',
      name: 'Neon Defender',
      description: 'Space shooter with vibrant neon graphics',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: '2',
      name: 'Cyber Blocks',
      description: 'Puzzle game set in a cyberpunk world',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
  ];

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-gradient-to-b from-cyber-terminal to-cyber-card border-r border-cyber-primary z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyber-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-cyber-primary bg-opacity-20 flex items-center justify-center">
              <User size={20} className="text-cyber-primary" />
            </div>
            <div>
              <p className="text-cyber-primary font-medium text-sm">LOGGED IN</p>
              <p className="text-cyber-text text-xs truncate max-w-[180px]">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-cyber-muted hover:text-cyber-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex border-b border-cyber-border">
          <button
            onClick={() => setActiveSection('queries')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeSection === 'queries'
                ? 'text-cyber-primary bg-cyber-primary bg-opacity-10 border-b-2 border-cyber-primary'
                : 'text-cyber-muted hover:text-cyber-text'
            }`}
          >
            <History size={16} />
            <span>QUERIES</span>
          </button>
          <button
            onClick={() => setActiveSection('games')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeSection === 'games'
                ? 'text-cyber-primary bg-cyber-primary bg-opacity-10 border-b-2 border-cyber-primary'
                : 'text-cyber-muted hover:text-cyber-text'
            }`}
          >
            <Gamepad2 size={16} />
            <span>GAMES</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeSection === 'queries' ? (
            <div className="space-y-3">
              {mockQueries.map((query) => (
                <div
                  key={query.id}
                  className="p-3 rounded-lg bg-cyber-card border border-cyber-border hover:border-cyber-primary transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-cyber-text text-sm line-clamp-2 group-hover:text-cyber-primary transition-colors">
                        {query.prompt}
                      </p>
                      <p className="text-cyber-muted text-xs mt-2">
                        {formatTimestamp(query.timestamp)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-cyber-muted group-hover:text-cyber-primary transition-colors ml-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {mockGames.map((game) => (
                <div
                  key={game.id}
                  className="p-3 rounded-lg bg-cyber-card border border-cyber-border hover:border-cyber-primary transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-cyber-primary font-medium text-sm group-hover:cyber-glow-sm">
                        {game.name}
                      </h4>
                      <p className="text-cyber-muted text-xs mt-1 line-clamp-2">
                        {game.description}
                      </p>
                      <p className="text-cyber-muted text-xs mt-2">
                        {formatTimestamp(game.timestamp)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-cyber-muted group-hover:text-cyber-primary transition-colors ml-2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {((activeSection === 'queries' && mockQueries.length === 0) ||
            (activeSection === 'games' && mockGames.length === 0)) && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyber-primary bg-opacity-10 flex items-center justify-center">
                {activeSection === 'queries' ? (
                  <History size={24} className="text-cyber-primary" />
                ) : (
                  <Gamepad2 size={24} className="text-cyber-primary" />
                )}
              </div>
              <p className="text-cyber-muted text-sm">
                No {activeSection} yet
              </p>
              <p className="text-cyber-muted text-xs mt-1">
                Start creating to see your history
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyber-border">
          <button
            onClick={onLogout}
            className="cyber-button-secondary w-full flex items-center justify-center space-x-2"
          >
            <LogOut size={16} />
            <span>LOGOUT</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default UserSidebar;
