import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error(
        "Missing Email",
        {
          description: "Please enter your email address"
        }
      );
      return;
    }
    
    try {
      setLoading(true);
      await resetPassword(email);
      
      toast.success(
        "Reset Email Sent",
        {
          description: "Please check your email for password reset instructions"
        }
      );
      
      // Navigate back to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(
        "Reset Failed",
        {
          description: error.message || "Failed to send reset email. Please try again."
        }
      );
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
        <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
        <CardDescription className="text-center">
          Enter your email address and we'll send you instructions to reset your password
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
              disabled={loading}
              autoComplete="email"
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
                  <Mail size={18} />
                </span>
                Sending...
              </div>
            ) : (
              <div className="flex items-center">
                <Mail size={18} className="mr-2" />
                Send Reset Link
              </div>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-center text-muted-foreground">
          Remember your password?{" "}
          <Button 
            variant="link" 
            className="p-0 h-auto" 
            onClick={() => navigate('/login')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to login
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ForgotPasswordForm; 