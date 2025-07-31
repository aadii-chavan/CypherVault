import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AuthenticatedRouteProps {
  children: React.ReactNode;
}

/**
 * AuthenticatedRoute - Only checks if user is logged in
 * Unlike ProtectedRoute, it doesn't require the vault to be unlocked
 */
const AuthenticatedRoute: React.FC<AuthenticatedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  
  // User is authenticated, render children
  return <>{children}</>;
};

export default AuthenticatedRoute; 