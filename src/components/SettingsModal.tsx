import { useState, useEffect } from 'react';
import { X, Key } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('dassh_api_keys');
      if (saved) {
        try {
          const keys = JSON.parse(saved);
          setGroqKey(keys.groq || '');
          setGeminiKey(keys.gemini || '');
          setOpenaiKey(keys.openai || '');
        } catch (e) {}
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem(
      'dassh_api_keys',
      JSON.stringify({
        groq: groqKey.trim(),
        gemini: geminiKey.trim(),
        openai: openaiKey.trim(),
      })
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-cyber-card border border-cyber-border rounded-xl w-full max-w-md shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cyber-border bg-cyber-terminal/30">
          <div className="flex items-center space-x-2">
            <Key className="text-cyber-primary" size={20} />
            <h2 className="text-xl font-bold text-cyber-text font-cyber tracking-wider">Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-cyber-muted hover:text-white p-1 rounded hover:bg-cyber-primary/20 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-sm text-cyber-muted">
          <div>
            <p className="mb-4">DASSH requires an LLM API key to generate games and chat. Your keys are stored locally in your browser and are never saved on our servers.</p>
          </div>

          <div className="space-y-4">
            {/* Groq Key */}
            <div className="space-y-2">
              <label className="block font-medium text-cyber-text flex items-center justify-between">
                Groq API Key (Recommended)
                <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-xs text-cyber-primary hover:underline">Get Free Key &rarr;</a>
              </label>
              <input 
                type="password"
                placeholder="gsk_..."
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                className="w-full bg-cyber-dark border border-cyber-border rounded-lg p-3 text-cyber-text focus:outline-none focus:border-cyber-primary transition-colors"
              />
            </div>

            {/* Gemini Key */}
            <div className="space-y-2">
              <label className="block font-medium text-cyber-text flex items-center justify-between">
                Google Gemini API Key
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-cyber-primary hover:underline">Get Free Key &rarr;</a>
              </label>
              <input 
                type="password"
                placeholder="AIza..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full bg-cyber-dark border border-cyber-border rounded-lg p-3 text-cyber-text focus:outline-none focus:border-cyber-primary transition-colors"
              />
            </div>

            {/* OpenAI Key */}
            <div className="space-y-2">
              <label className="block font-medium text-cyber-text flex items-center justify-between">
                OpenAI API Key (Paid)
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-xs text-cyber-primary hover:underline">Get Key &rarr;</a>
              </label>
              <input 
                type="password"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full bg-cyber-dark border border-cyber-border rounded-lg p-3 text-cyber-text focus:outline-none focus:border-cyber-primary transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-cyber-border bg-cyber-terminal/30 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-cyber-muted hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-cyber-primary text-black font-semibold hover:bg-cyber-accent transition-colors"
          >
            Save Keys
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
