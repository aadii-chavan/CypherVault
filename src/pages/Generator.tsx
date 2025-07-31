
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PasswordGenerator from '@/components/PasswordGenerator/Generator';

const Generator: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div className="container mx-auto p-4">
      <PasswordGenerator />
    </div>
  );
};

export default Generator;
