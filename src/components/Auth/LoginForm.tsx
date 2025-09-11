import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogIn, Lock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as secureStorage from '@/lib/secureStorage';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Load attempts from secure storage on component mount
  useEffect(() => {
    const loadAttempts = async () => {
      try {
        const storedAttempts = secureStorage.secureGet('loginAttempts');
        const storedLockTime = secureStorage.secureGet('loginLockedUntil');
        
        if (storedAttempts !== null) {
          setAttempts(storedAttempts);
        }
        
        if (storedLockTime !== null && storedLockTime > Date.now()) {
          setLockedUntil(storedLockTime);
        }
      } catch (error) {
        console.error('Error loading login attempts:', error);
      }
    };
    
    loadAttempts();
  }, []);
  
  // Update timer if account is locked
  useEffect(() => {
    if (!lockedUntil) return;
    
    const interval = setInterval(() => {
      const remaining = lockedUntil - Date.now();
      
      if (remaining <= 0) {
        clearInterval(interval);
        setLockedUntil(null);
        setTimeRemaining(0);
        // Reset attempts after lockout period
        setAttempts(0);
        secureStorage.secureSet('loginAttempts', 0);
        secureStorage.secureRemove('loginLockedUntil');
      } else {
        setTimeRemaining(Math.ceil(remaining / 1000));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if account is locked
    if (lockedUntil && lockedUntil > Date.now()) {
      const remainingMinutes = Math.ceil((lockedUntil - Date.now()) / 60000);
      toast.error(
        "Account Temporarily Locked",
        {
          description: `Too many failed login attempts. Please try again in ${remainingMinutes} minutes.`
        }
      );
      return;
    }
    
    if (!email || !password) {
      toast.error(
        "Missing Information",
        {
          description: "Please enter both your email and password"
        }
      );
      return;
    }
    
    try {
      setLoading(true);
      const result = await login(email, password);
      
      // If login successful, reset attempts
      if (result) {
        setAttempts(0);
        secureStorage.secureSet('loginAttempts', 0);
        secureStorage.secureRemove('loginLockedUntil');
        
        // Get display name from the logged in user
        const displayName = result.displayName || 'there';
        toast.success(
          `Welcome back, ${displayName}!`,
          {
            description: "You've successfully logged in to your vault"
          }
        );
        
        // Immediately clear sensitive data from memory
        setPassword('');
        
        // Navigate to unlock page
        navigate('/unlock');
      } else {
        // Login returned null, which means it failed
        // Increment failed attempts
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        secureStorage.secureSet('loginAttempts', newAttempts);
        
        // Generic message for security
        toast.error(
          "Login Failed",
          {
            description: "Invalid email or password. Please try again."
          }
        );
        
        // Check if we should lock the account
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          const lockUntil = Date.now() + LOCKOUT_DURATION;
          setLockedUntil(lockUntil);
          secureStorage.secureSet('loginLockedUntil', lockUntil);
          
          toast.error(
            "Account Temporarily Locked",
            {
              description: `Too many failed attempts. Please try again in 15 minutes.`
            }
          );
        }
      }
    } catch (error: any) {
      // Increment failed attempts
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      secureStorage.secureSet('loginAttempts', newAttempts);
      
      // Check if we should lock the account
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_DURATION;
        setLockedUntil(lockUntil);
        secureStorage.secureSet('loginLockedUntil', lockUntil);
        
        toast.error(
          "Account Temporarily Locked",
          {
            description: `Too many failed attempts. Please try again in 15 minutes.`
          }
        );
        
        // Log this security event
        try {
          // We don't have the user ID yet, so we can't use logAuditEvent
          // But we can record this in local audit logs
          console.error('Login locked due to too many failed attempts for:', email);
        } catch (e) {
          // Ignore errors in logging
        }
      } else {
        // Generic message for security
        toast.error(
          "Login Failed",
          {
            description: "Invalid email or password. Please try again."
          }
        );
        
        // For developers, log more detailed errors to console
        if (error.message) {
          console.error('Login error details:', error.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-4">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
        <CardDescription className="text-center">
          Enter your credentials to access your vault
        </CardDescription>
      </CardHeader>
      <CardContent>
        {lockedUntil && lockedUntil > Date.now() && (
          <Alert variant="destructive" className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Account temporarily locked. Please try again in {Math.ceil(timeRemaining / 60)} minutes and {timeRemaining % 60} seconds.
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || (lockedUntil !== null && lockedUntil > Date.now())}
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || (lockedUntil !== null && lockedUntil > Date.now())}
              autoComplete="current-password"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || (lockedUntil !== null && lockedUntil > Date.now())}
          >
            {loading ? (
              <div className="flex items-center">
                <span className="animate-spin mr-2">
                  <Lock size={18} />
                </span>
                Signing in...
              </div>
            ) : (
              <div className="flex items-center">
                <LogIn size={18} className="mr-2" />
                Sign In
              </div>
            )}
          </Button>
          <div className="flex justify-center">
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm"
              onClick={() => navigate('/forgot-password')}
            >
              Forgot password?
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-center text-muted-foreground">
          Don't have an account?{" "}
          <Button 
            variant="link" 
            className="p-0 h-auto" 
            onClick={() => navigate('/signup')}
          >
            Sign up
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;
