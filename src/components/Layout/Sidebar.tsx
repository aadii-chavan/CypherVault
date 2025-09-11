import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Key, Settings, Shield, LogOut, FileText, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SidebarProps {
  open: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const { isAuthenticated, vaultUnlocked, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated) return null;

  const isActive = (path: string) => location.pathname === path;
  const displayName = user?.displayName || 'Account';
  const email = user?.email || '';

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const menuItems = [
    {
      name: 'Vault',
      path: '/vault',
      icon: <Shield size={20} />,
      requiresUnlock: false // Changed from true to false
    },
    {
      name: 'Password Generator',
      path: '/generator',
      icon: <Key size={20} />,
      requiresUnlock: false
    },
    // Re-enabling Security Center
    {
      name: 'Security Center',
      path: '/security',
      icon: <Shield size={20} />,
      requiresUnlock: false
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: <Settings size={20} />,
        requiresUnlock: false
      }
    ];

    return (
      <div className={cn(
        "fixed inset-y-0 left-0 z-20 w-56 sm:w-64 bg-card border-r border-border transition-all duration-300 ease-in-out transform",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        "pt-16" // Space for navbar
      )}>
        <ScrollArea className="h-full">
          <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
            {/* User Profile Section */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-1">
              {menuItems.map((item) => {
                const disabled = item.requiresUnlock && !vaultUnlocked;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start text-sm sm:text-base",
                    isActive(item.path) && "bg-primary/10 text-primary hover:bg-primary/20",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !disabled && navigate(item.path)}
                  disabled={disabled}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Button>
              );
            })}
          </div>
          
          {/* Divider */}
          <div className="border-t border-border my-4"></div>
          
          {/* Logout */}
          <Button
            variant="outline"
            className="w-full justify-start text-sm sm:text-base text-destructive hover:text-destructive"
            onClick={() => signOut().then(() => navigate('/login'))}
          >
            <LogOut size={20} className="mr-2" />
            Sign Out
          </Button>
          
          {/* App Info */}
          <div className="pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1 mb-1">
              <FileText size={12} />
              <span>CypherVault v1.0</span>
            </div>
            <p>Your secure password vault</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default Sidebar;
