import { useState } from 'react';
import { Share2, Download, Lock, Sparkles, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const gameCategories = [
  { id: 'rpg', name: 'RPG Adventure', icon: '🗡️' },
  { id: 'strategy', name: 'Strategy', icon: '🎯' },
  { id: 'puzzle', name: 'Puzzle Game', icon: '🧩' },
  { id: 'open-world', name: 'Open World', icon: '🌎' },
  { id: 'action', name: 'Action', icon: '⚡' },
];

const CreateGame = () => {
  const [gameIdea, setGameIdea] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreate = () => {
    if (!gameIdea.trim()) {
      toast({ title: 'Please describe your game idea', variant: 'destructive' });
      return;
    }

    if (gameIdea.trim().length < 3) {
      toast({ title: 'Description too short', description: 'Give a bit more detail about your game idea', variant: 'destructive' });
      return;
    }

    setIsCreating(true);

    // Navigate to workspace, passing the prompt and category via router state
    // GameWorkspace will pick these up and call the AI immediately
    navigate('/workspace', {
      state: { prompt: gameIdea.trim(), category: selectedCategory },
    });
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-arcade-dark">
      <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          <span>Back to home</span>
        </button>

        {/* Icon */}
        <div className="w-full flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-arcade-terminal flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full bg-arcade-purple opacity-20 blur-xl" />
            <div className="text-3xl">🎮</div>
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-white text-center mb-16 tracking-tight">
          Idea to game in seconds.
        </h1>

        {/* Game creation area */}
        <div className="bg-arcade-terminal/40 backdrop-blur-sm rounded-xl p-6 border border-gray-800 shadow-xl max-w-4xl mx-auto mb-8">
          <textarea
            value={gameIdea}
            onChange={(e) => setGameIdea(e.target.value)}
            placeholder="Describe your game idea... e.g. 'A platformer where a ninja jumps between rooftops collecting coins while avoiding enemy guards'"
            className="w-full bg-arcade-terminal border border-gray-700 rounded-lg p-4 min-h-28 text-white focus:outline-none focus:ring-2 focus:ring-arcade-purple resize-none placeholder:text-gray-500"
            maxLength={1000}
          />

          <div className="flex items-center justify-between mt-2 mb-4">
            <span className="text-gray-500 text-xs">{gameIdea.length}/1000</span>
          </div>

          <div className="flex flex-wrap items-center justify-between mt-2">
            <div className="flex space-x-3">
              <button className="p-2 text-gray-400 hover:text-white" title="Share">
                <Share2 size={20} />
              </button>
              <button className="p-2 text-gray-400 hover:text-white" title="Download">
                <Download size={20} />
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center px-3 py-1.5 text-sm border border-gray-700 rounded-lg bg-arcade-terminal/80">
                <Lock size={16} className="mr-2 text-gray-400" />
                <span className="text-gray-300">Public</span>
              </div>

              <button
                onClick={handleCreate}
                disabled={isCreating || !gameIdea.trim()}
                className="bg-arcade-purple hover:bg-opacity-90 text-white rounded-lg px-6 py-2 flex items-center font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                <Sparkles size={18} className="mr-2" />
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>

        {/* Game categories */}
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {gameCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(selectedCategory === category.id ? '' : category.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-all ${
                selectedCategory === category.id
                  ? 'bg-arcade-purple/20 border-arcade-purple text-white shadow-lg shadow-arcade-purple/20'
                  : 'bg-arcade-terminal/40 border-gray-700 text-gray-300 hover:bg-arcade-terminal/60'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {selectedCategory && (
          <p className="text-center text-gray-400 text-sm mt-4">
            Category: <span className="text-arcade-purple font-medium">{gameCategories.find(c => c.id === selectedCategory)?.name}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default CreateGame;
