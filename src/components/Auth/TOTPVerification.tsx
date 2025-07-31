import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface TOTPVerificationProps {
  onVerify: (code: string) => Promise<boolean>;
  onCancel?: () => void;
}

const TOTPVerification: React.FC<TOTPVerificationProps> = ({
  onVerify,
  onCancel
}) => {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const { toast } = useToast();

  // Countdown timer for TOTP code validity
  useEffect(() => {
    // Calculate seconds remaining in the current time window (default 30s)
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const timeWindow = 30; // Standard TOTP time window
      return timeWindow - (now % timeWindow);
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      // Remind the user when the current code is about to expire
      if (remaining === 5) {
        toast({
          title: "Code expiring soon",
          description: "Current verification code will expire in 5 seconds"
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid 6-digit verification code",
        variant: "destructive"
      });
      return;
    }
    
    setIsVerifying(true);
    
    try {
      const success = await onVerify(code);
      
      if (!success) {
        toast({
          title: "Verification failed",
          description: "The code you entered is incorrect. Please try again.",
          variant: "destructive"
        });
        setCode('');
      }
    } catch (error) {
      toast({
        title: "Verification error",
        description: "An error occurred during verification. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="text-2xl font-bold mb-2">Two-Factor Authentication</div>
        <p className="text-muted-foreground">
          Please enter the 6-digit code from your authenticator app
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="totp-code">Verification Code</Label>
          <Input
            id="totp-code"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
            maxLength={6}
            className="text-center text-xl tracking-widest"
            autoFocus
          />
        </div>
        
        <div className="text-center text-sm text-muted-foreground">
          Code refreshes in {timeLeft} seconds
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isVerifying}
              className="w-full"
            >
              Cancel
            </Button>
          )}
          
          <Button 
            type="submit" 
            disabled={code.length !== 6 || isVerifying}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TOTPVerification;