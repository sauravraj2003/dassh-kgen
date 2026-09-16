import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput = ({ onSendMessage, disabled = false, placeholder }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      // Reset height
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-end space-x-3">
          {/* Message input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder ?? 'Type your message... (Enter to send, Shift+Enter for new line)'}
              disabled={disabled}
              className={`w-full bg-cyber-terminal border rounded-lg px-4 py-3 pr-12 text-cyber-text placeholder-cyber-muted resize-none focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                placeholder
                  ? 'border-cyan-500/50 focus:ring-cyan-500'
                  : 'border-cyber-border focus:ring-cyber-primary'
              }`}
              style={{ minHeight: '52px', maxHeight: '200px', lineHeight: '1.5' }}
            />
            {/* Send button */}
            <button
              type="submit"
              disabled={!message.trim() || disabled}
              className="absolute right-2 bottom-2 p-2 bg-cyber-primary text-cyber-dark rounded-lg hover:bg-opacity-80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-2 text-xs text-cyber-muted">
          {message.length > 0 && <span>{message.length}/2000 characters</span>}
          <span className="ml-4">Shift+Enter for new line</span>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;