import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, vaultUnlocked, user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="flex flex-1 overflow-hidden">
        {isAuthenticated && (
          <Sidebar open={sidebarOpen} />
        )}
        
        <main className={`flex-1 transition-all duration-300 ${isAuthenticated ? 'md:ml-64' : ''}`}>
          <div className="min-h-[calc(100vh-64px)] p-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
