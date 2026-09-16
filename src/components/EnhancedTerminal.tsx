
import { useEffect, useState, useRef } from 'react';

const EnhancedTerminal = () => {
  const [inputValue, setInputValue] = useState('');
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = [
    "create-game Make a retro arcade shooter with pixel art",
    "create-game Design a puzzle platformer with gravity manipulation",
    "create-game Build a text-based adventure in a futuristic wasteland",
    "create-game Generate a top-down dungeon crawler with magic spells",
    "create-game Produce a simple racing game with cartoon graphics"
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
        // Wait for 3 seconds, then clear and move to next suggestion
        timeoutId = setTimeout(() => {
          setDisplayedText('');
          setCurrentSuggestionIndex((prev) => (prev + 1) % suggestions.length);
        }, 3000);
      }
    };

    // Start typing after a brief delay
    timeoutId = setTimeout(typeNextChar, 1000);

    return () => clearTimeout(timeoutId);
  }, [currentSuggestionIndex, isUserTyping]);

  // Cursor blink effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);

    return () => clearInterval(blinkInterval);
  }, []);

  const handleTerminalClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Handle game creation logic here
      console.log('Creating game:', inputValue);
    }
  };

  return (
    <div className="terminal max-w-3xl mx-auto my-8 opacity-0 animate-fade-in delay-200">
      <div className="terminal-header">
        <div className="terminal-button close-button"></div>
        <div className="terminal-button minimize-button"></div>
        <div className="terminal-button maximize-button"></div>
        <div className="ml-auto text-xs text-gray-400">dassh-terminal</div>
      </div>
      <div 
        ref={terminalRef}
        className="terminal-content text-sm md:text-base font-mono mt-2 h-20 flex items-center cursor-text"
        onClick={handleTerminalClick}
      >
        <span className="text-cyber-accent mr-2">$</span>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyPress={handleKeyPress}
            className="absolute inset-0 bg-transparent border-none outline-none text-cyber-accent w-full"
            placeholder=""
            style={{ 
              color: 'transparent',
              caretColor: '#00FFCC'
            }}
          />
          <div className="text-cyber-accent">
            {isUserTyping ? inputValue : displayedText}
            <span className={`cursor ${cursorVisible ? 'opacity-100' : 'opacity-0'}`}></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTerminal;
