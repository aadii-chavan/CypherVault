import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireUnlock?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireUnlock = true 
}) => {
  const { user, isAuthenticated, vaultUnlocked } = useAuth();
  const location = useLocation();
  
  // Not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  
  // Authenticated but vault locked and we require unlock
  if (requireUnlock && !vaultUnlocked) {
    return <Navigate to="/unlock" replace state={{ from: location }} />;
  }
  
  // All conditions satisfied, render children
  return <>{children}</>;
};

export default ProtectedRoute; 