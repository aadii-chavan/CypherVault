
import React from 'react';
import { Navigate } from 'react-router-dom';
import SignupForm from '@/components/Auth/SignupForm';
import { useAuth } from '@/contexts/AuthContext';

const Signup: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/vault" replace />;
  }
  
  return (
    <div className="min-h-screen flex flex-col justify-center p-4">
      <SignupForm />
    </div>
  );
};

export default Signup;
