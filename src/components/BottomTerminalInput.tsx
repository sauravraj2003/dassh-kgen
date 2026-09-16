import { useEffect, useState, useRef } from 'react';
import { ArrowUp } from 'lucide-react';

const BottomTerminalInput = () => {
  const [inputValue, setInputValue] = useState('');
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = [
    "Make a retro arcade shooter with pixel art",
    "Design a puzzle platformer with gravity manipulation",
    "Build a text-based adventure in a futuristic wasteland",
    "Generate a top-down dungeon crawler with magic spells",
    "Produce a simple racing game with cartoon graphics"
  ];

  // Handle suggestion cycling and typing animation
  useEffect(() => {
    if (isUserTyping) return;

    const currentSuggestion = suggestions[currentSuggestionIndex];
    let charIndex = 0;
    let timeoutId: NodeJS.Timeout;

    const typeNextChar = () => {
      if (charIndex < currentSuggestion.length) {
        setDisplayedText(currentSuggestion.substring(0, charIndex + 1));
        charIndex++;
        timeoutId = setTimeout(typeNextChar, 50);
      } else {
        // Wait for 3 seconds, then clear with backspace effect
        timeoutId = setTimeout(() => {
          const backspaceEffect = () => {
            if (charIndex > 0) {
              setDisplayedText(currentSuggestion.substring(0, charIndex - 1));
              charIndex--;
              setTimeout(backspaceEffect, 30);
            } else {
              setCurrentSuggestionIndex((prev) => (prev + 1) % suggestions.length);
            }
          };
          backspaceEffect();
        }, 3000);
      }
    };

    // Start typing after a brief delay
    timeoutId = setTimeout(typeNextChar, 1000);

    return () => clearTimeout(timeoutId);
  }, [currentSuggestionIndex, isUserTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsUserTyping(e.target.value.length > 0);
  };

  const handleInputFocus = () => {
    setIsUserTyping(true);
  };

  const handleInputBlur = () => {
    if (inputValue.length === 0) {
      setIsUserTyping(false);
    }
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      console.log('Creating game:', inputValue);
      // Handle game creation logic here
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 mb-8 z-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-cyber-terminal border border-cyber-border rounded-xl overflow-hidden">
          {/* Terminal Header with Icons */}
          <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-cyber-border">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="text-xs text-gray-400">dassh-terminal</div>
          </div>
          
          {/* Terminal Content - Increased height with top-aligned text */}
          <div className="p-6 flex space-x-4 h-28">
            <div className="flex items-start pt-1">
              <span className="text-cyber-accent font-mono text-lg">$</span>
            </div>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyPress={handleKeyPress}
                className="w-full bg-transparent border-none outline-none text-cyber-text font-mono text-sm pt-1"
                placeholder=""
                style={{ 
                  color: isUserTyping ? '#c0c0c0' : 'transparent',
                  caretColor: 'transparent'
                }}
              />
              {!isUserTyping && (
                <div className="absolute inset-0 flex items-start text-cyber-text font-mono text-sm pointer-events-none pt-1">
                  {displayedText}
                  <span className="ml-1 w-2 h-5 bg-cyber-accent"></span>
                </div>
              )}
              {isUserTyping && (
                <div className="absolute inset-0 flex items-start text-cyber-text font-mono text-sm pointer-events-none pt-1">
                  {inputValue}
                  <span className="ml-1 w-2 h-5 bg-cyber-accent"></span>
                </div>
              )}
            </div>
            <div className="flex items-start pt-1">
              <button
                onClick={handleSubmit}
                className="bg-cyber-accent text-cyber-dark w-10 h-10 rounded-lg flex items-center justify-center hover:bg-opacity-80 transition-all duration-300"
                disabled={!inputValue.trim()}
              >
                <ArrowUp size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomTerminalInput;