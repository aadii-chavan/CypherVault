
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/vault" replace />;
  }
  
  return <Navigate to="/login" replace />;
};

export default Index;
