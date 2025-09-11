import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import UserProfileDropdown from '@/components/ui/UserProfileDropdown';

interface NavbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { isAuthenticated, vaultUnlocked, lockVault, user } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.displayName || 'Account';
  const email = user?.email || '';

  return (
    <nav className="sticky top-0 z-30 w-full bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          )}
          
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <span className="text-lg sm:text-xl font-bold">CypherVault</span>
          </div>
        </div>

        {/* Auth Actions */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm",
                vaultUnlocked 
                  ? "bg-green-500/20 text-green-500" 
                  : "bg-yellow-500/20 text-yellow-500"
              )}>
                <Lock size={12} className="hidden sm:block" />
                <span>{vaultUnlocked ? 'Unlocked' : 'Locked'}</span>
              </div>
              
              {vaultUnlocked && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={lockVault}
                >
                  Lock Vault
                </Button>
              )}

              {/* User profile dropdown with display name */}
              <UserProfileDropdown displayName={displayName} email={email} />
            </div>
          ) : (
            <div className="flex gap-1 sm:gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="hidden sm:inline-flex"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => navigate('/signup')}
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
