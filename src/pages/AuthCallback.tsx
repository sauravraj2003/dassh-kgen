import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// OAuth is removed. This page just redirects home.
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-dark">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyber-accent mx-auto mb-4"></div>
        <p className="text-cyber-text">Redirecting...</p>
      </div>
    </div>
  );
};

export default AuthCallback;