import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { useEffect } from "react";

import Layout from "@/components/Layout/Layout";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Unlock from "@/pages/Unlock";
import Vault from "@/pages/Vault";
import Generator from "@/pages/Generator";
import Settings from "@/pages/Settings";
import SecurityCenter from "../src/pages/SecurityCenter";
import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";
import ForgotPassword from "@/pages/ForgotPassword";
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AuthenticatedRoute from './components/Auth/AuthenticatedRoute';

const queryClient = new QueryClient();

// Component to handle global events like lock-vault
const GlobalEventHandler = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleLockVault = () => {
      console.log('Lock vault event received, redirecting to login page');
      navigate('/login');
    };
    
    // Add event listener for lock-vault event
    window.addEventListener('lock-vault', handleLockVault);
    
    // Clean up
    return () => {
      window.removeEventListener('lock-vault', handleLockVault);
    };
  }, [navigate]);
  
  return null; // This component doesn't render anything
};

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GlobalEventHandler />
        <Toaster 
          position="bottom-right"
          duration={5000}
          closeButton
          richColors
        />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Index />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="unlock" element={<AuthenticatedRoute><Unlock /></AuthenticatedRoute>} />
            <Route path="vault" element={<AuthenticatedRoute><Vault /></AuthenticatedRoute>} />
            <Route path="generator" element={<Generator />} />
            <Route path="settings" element={<AuthenticatedRoute><Settings /></AuthenticatedRoute>} />
            <Route path="security" element={<AuthenticatedRoute><SecurityCenter /></AuthenticatedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;
