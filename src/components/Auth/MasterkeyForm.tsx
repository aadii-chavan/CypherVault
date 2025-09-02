import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const MasterkeyForm: React.FC = () => {
  const [accountPassword, setAccountPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [attempts, setAttempts] = useState(0);
  const { unlockVault, signOut, vaultUnlocked } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if the vault is unlocked and redirect if needed
  useEffect(() => {
    if (vaultUnlocked) {
      const from = location.state?.from?.pathname || '/vault';
      navigate(from, { replace: true });
    }
  }, [vaultUnlocked, navigate, location]);
  
  // Add listener for clear-vault-key event
  useEffect(() => {
    const handleClearVaultKey = () => {
      setAccountPassword('');
      setLoading(false);
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        setLoadingTimeout(null);
      }
    };
    
    window.addEventListener('clear-vault-key', handleClearVaultKey);
    return () => {
      window.removeEventListener('clear-vault-key', handleClearVaultKey);
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [loadingTimeout]);
  
  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // If user presses Escape, clear the input
      if (event.key === 'Escape') {
        setMasterkey('');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountPassword) {
      toast.error(
        "Missing Password",
        {
          description: "Please enter your account password to unlock the vault"
        }
      );
      return;
    }
    
    setLoading(true);
    setAttempts(prev => prev + 1);
    
    // Set a timeout to exit loading state if it takes too long
    const timeout = setTimeout(() => {
      setLoading(false);
      toast.error(
        "Unlock Timeout",
        {
          description: "Unlocking is taking longer than expected. Please try again."
        }
      );
    }, 12000); // 12 seconds timeout (increased for compatibility checks)
    
    setLoadingTimeout(timeout);
    
    try {
      console.time('unlock-from-form');
      
      // Show immediate feedback
      if (attempts === 0) {
        toast.info(
          "Validating...",
          {
            description: "Validating and unlocking vault"
          }
        );
      }
      
      const success = await unlockVault(accountPassword);
      
      // Clear the timeout since we got a response
      clearTimeout(timeout);
      setLoadingTimeout(null);
      
      if (success) {
        toast.success(
          "Vault Unlocked",
          {
            description: "Your vault has been successfully unlocked. You can now access your passwords."
          }
        );
        
        // Wait a moment to ensure state is updated
        setTimeout(() => {
          const redirectPath = location.state?.from?.pathname || '/vault';
          navigate(redirectPath, { replace: true });
        }, 100);
      } else {
        toast.error(
          "Incorrect Password",
          {
            description: "The password you entered is incorrect. Please verify and try again."
          }
        );
        setAccountPassword('');
        setLoading(false);
      }
    } catch (error) {
      // Clear the timeout since we got a response
      clearTimeout(timeout);
      setLoadingTimeout(null);
      
      toast.error(
        "Unlock Failed",
        {
          description: "An error occurred while unlocking your vault. Please try again."
        }
      );
      setAccountPassword('');
      setLoading(false);
    } finally {
      // Always clear the console.time timer
      console.timeEnd('unlock-from-form');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Shield className="h-12 w-12 text-primary" />
            <Lock className="h-6 w-6 text-accent absolute bottom-0 right-0" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center">Unlock Your Vault</CardTitle>
        <CardDescription className="text-center">
          Enter your account password to access your secure vault
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Account Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={accountPassword}
              onChange={(e) => setAccountPassword(e.target.value)}
              required
              autoFocus
              autoComplete="new-password"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center">
                <span className="animate-spin mr-2">
                  <Lock size={18} />
                </span>
                Unlocking...
              </div>
            ) : (
              <div className="flex items-center">
                <Unlock size={18} className="mr-2" />
                Unlock Vault
              </div>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            signOut().then(() => navigate('/login'));
          }}
        >
          Sign out
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MasterkeyForm;
