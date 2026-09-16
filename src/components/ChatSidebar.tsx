import { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  User,
  Settings
} from 'lucide-react';

interface User {
  email: string;
  id: string;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: Date;
  updated_at: Date;
}

interface ChatSidebarProps {
  user: User | null;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onNewConversation: () => void;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversationId: string) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const ChatSidebar = ({
  user,
  conversations,
  currentConversation,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onLogout,
  onOpenSettings,
  collapsed,
  onToggleCollapse,
}: ChatSidebarProps) => {
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`bg-cyber-card border-r border-cyber-border flex flex-col transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-80'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-cyber-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <h1 className="text-cyber-accent font-bold text-xl font-cyber">DASSH</h1>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-cyber-terminal rounded-lg transition-colors text-cyber-muted hover:text-cyber-accent"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={onNewConversation}
          className={`w-full flex items-center justify-center space-x-2 cyber-button py-3 ${
            collapsed ? 'px-2' : 'px-4'
          }`}
        >
          <Plus size={18} />
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`relative group mb-2 rounded-lg transition-all duration-200 ${
              currentConversation?.id === conversation.id
                ? 'bg-cyber-primary bg-opacity-20 border border-cyber-primary'
                : 'hover:bg-cyber-terminal border border-transparent'
            }`}
            onMouseEnter={() => setHoveredConversation(conversation.id)}
            onMouseLeave={() => setHoveredConversation(null)}
          >
            <button
              onClick={() => onSelectConversation(conversation)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                collapsed ? 'flex justify-center' : ''
              }`}
            >
              {collapsed ? (
                <MessageSquare size={18} className="text-cyber-text" />
              ) : (
                <div>
                  <div className="text-cyber-text text-sm font-medium truncate">
                    {conversation.title}
                  </div>
                  <div className="text-cyber-muted text-xs mt-1">
                    {formatDate(new Date(conversation.updated_at))}
                  </div>
                </div>
              )}
            </button>
            
            {!collapsed && hoveredConversation === conversation.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conversation.id);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-red-500 hover:bg-opacity-20 rounded text-cyber-muted hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* User Section */}
      <div className="border-t border-cyber-border p-4">
        {!collapsed && user && (
          <div className="mb-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-cyber-primary bg-opacity-20 flex items-center justify-center">
                <User size={16} className="text-cyber-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-cyber-text text-sm font-medium truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className={`flex ${collapsed ? 'flex-col space-y-2' : 'space-x-2'}`}>
          {!collapsed && (
            <button 
              onClick={onOpenSettings}
              className="flex items-center space-x-2 text-cyber-muted hover:text-cyber-accent transition-colors p-2 rounded-lg hover:bg-cyber-terminal"
            >
              <Settings size={16} />
              <span className="text-sm">Settings</span>
            </button>
          )}
          
          <button
            onClick={onLogout}
            className={`flex items-center space-x-2 text-cyber-muted hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-cyber-terminal ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={16} />
            {!collapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;