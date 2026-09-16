import { useState } from 'react';
import { X, Eye, EyeOff, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { email: string; id: string }) => void;
}

const AuthModal = ({ isOpen, onClose, onLoginSuccess }: AuthModalProps) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!formData.email || !formData.password) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return false;
    }
    if (activeTab === 'signup' && formData.password !== formData.confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return false;
    }
    if (formData.password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const user = activeTab === 'login'
        ? await authService.login(formData.email, formData.password)
        : await authService.register(formData.email, formData.password);

      if (activeTab === 'signup') {
        toast({ title: 'Account created!', description: 'Welcome to DASSH.' });
      }
      onLoginSuccess({ email: user.email, id: user.user_id });
      onClose();
      setFormData({ email: '', password: '', confirmPassword: '' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Authentication failed', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    try {
      const user = await authService.loginAsGuest();
      toast({ title: 'Continuing as Guest', description: "Your chats won't be saved permanently." });
      onLoginSuccess({ email: user.email, id: user.user_id });
      onClose();
    } catch (error: any) {
      toast({ title: 'Guest login failed', description: error.message || 'Try again', variant: 'destructive' });
    } finally {
      setIsGuestLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cyber-modal-overlay flex items-center justify-center p-4">
      <div className="cyber-modal w-full max-w-md p-6 relative">

        <button onClick={onClose} className="absolute top-4 right-4 text-cyber-muted hover:text-cyber-accent transition-colors">
          <X size={20} />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-cyber-accent cyber-glow mb-2">
            {activeTab === 'login' ? 'ACCESS TERMINAL' : 'CREATE ACCOUNT'}
          </h2>
          <p className="text-cyber-muted text-sm">
            {activeTab === 'login' ? 'Enter your credentials to access the system' : 'Initialize new user account'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 border-b border-cyber-border">
          {(['login', 'signup'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                activeTab === tab ? 'text-cyber-accent border-b-2 border-cyber-accent' : 'text-cyber-muted hover:text-cyber-text'
              }`}
            >
              {tab === 'login' ? 'LOGIN' : 'SIGN UP'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cyber-text mb-2">EMAIL</label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange}
              className="cyber-input w-full" placeholder="user@domain.com" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-cyber-text mb-2">PASSWORD</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password}
                onChange={handleInputChange} className="cyber-input w-full pr-12" placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted hover:text-cyber-accent transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {activeTab === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-cyber-text mb-2">CONFIRM PASSWORD</label>
              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword"
                  value={formData.confirmPassword} onChange={handleInputChange}
                  className="cyber-input w-full pr-12" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted hover:text-cyber-accent transition-colors">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={isLoading}
            className="cyber-button w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? 'PROCESSING...' : (activeTab === 'login' ? 'ACCESS SYSTEM' : 'CREATE ACCOUNT')}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div className="flex-1 h-px bg-cyber-border" />
          <span className="px-3 text-cyber-muted text-xs">OR</span>
          <div className="flex-1 h-px bg-cyber-border" />
        </div>

        {/* Guest */}
        <button onClick={handleGuestLogin} disabled={isGuestLoading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-cyber-border text-cyber-muted hover:text-cyber-text hover:border-cyber-accent transition-all duration-200 text-sm disabled:opacity-50">
          <UserX size={16} />
          {isGuestLoading ? 'Entering as Guest...' : 'Continue as Guest'}
        </button>

        <p className="text-center text-cyber-muted text-xs mt-3">
          Guest sessions are temporary. Sign up to save your work.
        </p>
      </div>
    </div>
  );
};

export default AuthModal;