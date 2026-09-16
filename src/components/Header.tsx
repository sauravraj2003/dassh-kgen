
import { User } from 'lucide-react';

interface User {
  email: string;
  id: string;
}

interface HeaderProps {
  user: User | null;
  onLoginClick: () => void;
  onSidebarToggle: () => void;
  onAboutClick: () => void;
}

const Header = ({ user, onLoginClick, onSidebarToggle, onAboutClick }: HeaderProps) => {
  return (
    // Use fixed positioning to ensure it spans the full screen width
    <header className="py-4 fixed top-0 left-0 right-0 w-full z-50 bg-transparent">
      {/* Minimal padding to touch screen edges */}
      <div className="w-full flex items-center justify-between px-2">
        {/* DASSH Logo in a box - extreme left */}
        <div className="border border-cyber-accent rounded-md">
          <h1
            className="font-bold text-cyber-accent text-lg md:text-xl tracking-widest font-cyber px-2 py-1"
            style={{ letterSpacing: '0.2em' }}
          >
            DASSH
          </h1>
        </div>

        {/* Right side - Only ABOUT button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onAboutClick}
            className="cyber-button-small glow-on-hover text-sm w-16 h-10 flex items-center justify-center"
          >
            ABOUT
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
