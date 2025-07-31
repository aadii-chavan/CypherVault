import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import MasterkeyForm from '@/components/Auth/MasterkeyForm';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

const Unlock: React.FC = () => {
  const { isAuthenticated, vaultUnlocked, user } = useAuth();
  const location = useLocation();
  
  console.log('Unlock page:', { isAuthenticated, vaultUnlocked, userId: user?.uid });

  const debugMode = false; // Set to false to disable debug info

  // Redirect if not authenticated
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // Redirect if already unlocked, but only if we're on the unlock page
  if (vaultUnlocked && location.pathname === '/unlock') {
    console.log('Vault already unlocked, redirecting to vault');
    return <Navigate to="/vault" replace />;
  }
  
  return (
    <div className="min-h-screen flex flex-col justify-center p-4">
      <MasterkeyForm />
    </div>
  );
};

export default Unlock;
