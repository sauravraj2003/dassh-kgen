/**
 * ChatMessages.tsx
 * ----------------
 * Renders the chat message list.
 * Long code blocks (>500 chars) are collapsed into a "View Code" toggle
 * so they don't flood the chat UI.
 */
import { User, Bot, Copy, Check, ChevronDown, ChevronUp, Code2 } from 'lucide-react';
import { useState } from 'react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatMessagesProps {
  messages: Message[];
  isGenerating: boolean;
}

/** Detect if a string is mostly code (HTML/JS/CSS) */
function isCodeContent(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('```') ||
    (trimmed.includes('<canvas') && trimmed.includes('<script')) ||
    (trimmed.length > 500 && (trimmed.split('\n').length > 20) &&
      (trimmed.includes('function') || trimmed.includes('{') && trimmed.includes('}')))
  );
}

/** Collapsed code preview pill */
function CodeBlock({ content, messageId }: { content: string; messageId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = content.split('\n').length;

  return (
    <div className="mt-2 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header pill */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800/80">
        <div className="flex items-center gap-2">
          <Code2 size={13} className="text-cyan-400" />
          <span className="text-xs text-gray-400 font-mono">{lineCount} lines of code</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Collapse' : 'View Code'}
          </button>
        </div>
      </div>
      {/* Expandable code body */}
      {expanded && (
        <pre className="text-xs text-green-300 font-mono p-3 bg-gray-950 overflow-auto max-h-96 leading-relaxed whitespace-pre-wrap break-all">
          {content}
        </pre>
      )}
    </div>
  );
}

/** Render a single message bubble, collapsing code if needed */
function MessageBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);
  const isCode = isCodeContent(message.content);

  const formatTime = (ts: Date) =>
    ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex space-x-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.role === 'assistant' && (
        <div className="w-8 h-8 rounded-full bg-cyber-primary bg-opacity-20 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot size={18} className="text-cyber-primary" />
        </div>
      )}

      <div className={`max-w-3xl min-w-0 ${message.role === 'user' ? 'order-first' : ''}`}>
        <div
          className={`rounded-lg p-4 ${
            message.role === 'user'
              ? 'bg-cyber-primary bg-opacity-20 border border-cyber-primary'
              : 'bg-cyber-terminal border border-cyber-border'
          }`}
        >
          {isCode ? (
            /* Show a "Game code generated" message + collapsed code block */
            <div>
              <p className="text-cyber-text text-sm mb-1">
                ✅ Game code generated successfully. Use the game panel on the right to play it.
              </p>
              <CodeBlock content={message.content} messageId={message.id} />
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <p className="text-cyber-text whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-cyber-border border-opacity-30">
            <span className="text-cyber-muted text-xs">{formatTime(message.timestamp)}</span>
            {message.role === 'assistant' && (
              <button
                onClick={handleCopy}
                className="text-cyber-muted hover:text-cyber-accent transition-colors p-1 rounded"
                title="Copy message"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {message.role === 'user' && (
        <div className="w-8 h-8 rounded-full bg-cyber-accent bg-opacity-20 flex items-center justify-center flex-shrink-0 mt-1">
          <User size={18} className="text-cyber-accent" />
        </div>
      )}
    </div>
  );
}

const ChatMessages = ({ messages, isGenerating }: ChatMessagesProps) => {
  if (messages.length === 0 && !isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyber-primary bg-opacity-20 flex items-center justify-center">
            <Bot size={32} className="text-cyber-primary" />
          </div>
          <h3 className="text-cyber-accent text-xl font-bold mb-2">Welcome to DASSH</h3>
          <p className="text-cyber-muted">
            Start a conversation or say <span className="text-purple-400">"make a snake game"</span> to generate a live playable game!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 space-y-6">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {isGenerating && (
        <div className="flex space-x-4 justify-start">
          <div className="w-8 h-8 rounded-full bg-cyber-primary bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Bot size={18} className="text-cyber-primary" />
          </div>
          <div className="max-w-3xl">
            <div className="bg-cyber-terminal border border-cyber-border rounded-lg p-4">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-cyber-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-cyber-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-cyber-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;