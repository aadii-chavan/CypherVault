import React from 'react';
import { Navigate } from 'react-router-dom';
import ForgotPasswordForm from '@/components/Auth/ForgotPasswordForm';
import { useAuth } from '@/contexts/AuthContext';

const ForgotPassword: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/unlock" replace />;
  }
  
  return (
    <div className="min-h-screen flex flex-col justify-center p-4">
      <ForgotPasswordForm />
    </div>
  );
};

export default ForgotPassword; 