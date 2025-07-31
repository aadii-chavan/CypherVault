import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AccountSettings from '@/components/Settings/AccountSettings';

const Settings: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
      <AccountSettings />
    </div>
  );
};

export default Settings;
