
import React from 'react';
import { Navigate } from 'react-router-dom';
import LoginForm from '@/components/Auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';

const Login: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/unlock" replace />;
  }
  
  return (
    <div className="min-h-screen flex flex-col justify-center p-4">
      <LoginForm />
    </div>
  );
};

export default Login;
