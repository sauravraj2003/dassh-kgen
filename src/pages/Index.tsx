import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import StarDefenderGame from '@/components/StarDefenderGame';
import AuthModal from '@/components/AuthModal';
import AboutPage from '@/components/AboutPage';
import { useToast } from '@/hooks/use-toast';
import { authService, type AuthUser } from '@/lib/authService';

interface User { email: string; id: string; }

const Index = () => {
  const [loaded, setLoaded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Try restore session from refresh cookie
    authService.restoreSession().then(u => {
      if (u) setUser({ email: u.email, id: u.user_id });
      setIsLoading(false);
    });

    // Listen for auth changes
    const unsub = authService.onAuthStateChange((authUser: AuthUser | null) => {
      if (authUser) {
        setUser({ email: authUser.email, id: authUser.user_id });
      } else {
        setUser(null);
      }
    });

    return unsub;
  }, []);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    setShowAuthModal(false);
    toast({ title: 'Welcome!', description: `Logged in as ${userData.email}` });
    navigate('/chat');
  };

  if (showAbout) {
    return (
      <div className="min-h-screen flex flex-col overflow-hidden relative">
        <StarDefenderGame />
        <AboutPage onBackClick={() => setShowAbout(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col overflow-hidden relative">
      <StarDefenderGame />
      <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl relative z-10">
        <Header
          user={user}
          onLoginClick={() => setShowAuthModal(true)}
          onSidebarToggle={() => {}}
          onAboutClick={() => setShowAbout(true)}
        />

        <div className={`mt-20 mb-32 text-center transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 font-cyber">
            <span className="text-cyber-accent cyber-glow-sm">Hi user, I am DASSH</span>
          </h2>
          <p className="text-lg text-cyber-text max-w-3xl mx-auto mb-8 leading-relaxed">
            Welcome to the future of AI conversation. I'm your intelligent assistant,
            designed to help you with any questions, creative projects, or complex problems.
            Whether you're looking for detailed explanations, creative writing assistance,
            coding help, or just want to have an engaging conversation — I'm here.
          </p>

          <div className="mt-12 space-y-4">
            {user ? (
              <button onClick={() => navigate('/chat')} className="cyber-button text-lg px-8 py-4 glow-on-hover">
                Continue to Chat
              </button>
            ) : (
              <div className="space-y-4">
                <button onClick={() => setShowAuthModal(true)} className="cyber-button text-lg px-8 py-4 glow-on-hover block mx-auto">
                  Start Creating
                </button>
                <button onClick={() => setShowAuthModal(true)} className="cyber-button-secondary text-base px-6 py-3 block mx-auto">
                  Already have an account? Login
                </button>
              </div>
            )}
            {user && <div className="text-cyber-muted">Welcome back, {user.email}</div>}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default Index;
