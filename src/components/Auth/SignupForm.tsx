import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, UserPlus, Lock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { calculatePasswordStrength } from '@/lib/encryption';

const SignupForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [masterkey, setMasterkey] = useState('');
  const [confirmMasterkey, setConfirmMasterkey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordStrength = calculatePasswordStrength(password);
  const masterkeyStrength = calculatePasswordStrength(masterkey);

  const getStrengthColor = (strength: 'weak' | 'medium' | 'strong') => {
    switch (strength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-red-500';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword || !masterkey || !confirmMasterkey || !displayName) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure your passwords match",
        variant: "destructive"
      });
      return;
    }
    
    if (masterkey !== confirmMasterkey) {
      toast({
        title: "Masterkeys do not match",
        description: "Please make sure your masterkeys match",
        variant: "destructive"
      });
      return;
    }
    
    if (passwordStrength === 'weak') {
      toast({
        title: "Weak password",
        description: "Please use a stronger password",
        variant: "destructive"
      });
      return;
    }
    
    if (masterkeyStrength === 'weak') {
      toast({
        title: "Weak masterkey",
        description: "Please use a stronger masterkey",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      const userCredential = await signUp(email, password, displayName, masterkey);
      
      if (userCredential) {
        toast({
          title: "Account created",
          description: "Your account has been created successfully",
          variant: "default"
        });
        navigate('/unlock');
      }
    } catch (error: any) {
      setLoading(false);
      toast({
        title: "Signup failed",
        description: error.message || "An error occurred during signup",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-4">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
        <CardDescription className="text-center">
          Create an account to start managing your passwords
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Your Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
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
              className="font-lato"
            />
            {password && (
              <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getStrengthColor(passwordStrength)}`} 
                  style={{ width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%' }}
                ></div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="font-lato"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="masterkey">Masterkey</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1">
                      <Info size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>The masterkey encrypts your vault data. It is never stored on our servers. If you forget it, your data cannot be recovered.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="masterkey"
              type="password"
              placeholder="Enter your masterkey"
              value={masterkey}
              onChange={(e) => setMasterkey(e.target.value)}
              required
            />
            {masterkey && (
              <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getStrengthColor(masterkeyStrength)}`} 
                  style={{ width: masterkeyStrength === 'weak' ? '33%' : masterkeyStrength === 'medium' ? '66%' : '100%' }}
                ></div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmMasterkey">Confirm Masterkey</Label>
            <Input
              id="confirmMasterkey"
              type="password"
              placeholder="Confirm your masterkey"
              value={confirmMasterkey}
              onChange={(e) => setConfirmMasterkey(e.target.value)}
              required
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
                Creating account...
              </div>
            ) : (
              <div className="flex items-center">
                <UserPlus size={18} className="mr-2" />
                Create Account
              </div>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <Button 
            variant="link" 
            className="p-0 h-auto" 
            onClick={() => navigate('/login')}
          >
            Sign in
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default SignupForm;
