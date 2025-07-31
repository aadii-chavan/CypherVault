import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, RefreshCw, Loader2, QrCode } from 'lucide-react';
import * as totpUtils from '@/lib/totpUtils';

interface TOTPSetupProps {
  userEmail: string;
  onSetupComplete: (secret: string) => Promise<void>;
  onCancel: () => void;
}

const TOTPSetup: React.FC<TOTPSetupProps> = ({
  userEmail,
  onSetupComplete,
  onCancel
}) => {
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Generate a new TOTP secret on component mount
    generateSecret();
  }, []);

  const generateSecret = () => {
    const newSecret = totpUtils.generateTOTPSecret();
    setSecret(newSecret);
    
    // Generate the URI for the QR code
    const newUri = totpUtils.generateTOTPUri(newSecret, userEmail);
    setUri(newUri);
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast({
      title: "Secret copied",
      description: "The secret key has been copied to your clipboard"
    });
    
    // Reset the copied state after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid 6-digit verification code",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Verify the code using the generated secret
      const isValid = totpUtils.verifyTOTP(verificationCode, secret);
      
      if (isValid) {
        // Complete the setup process with the valid secret
        await onSetupComplete(secret);
        
        toast({
          title: "2FA enabled",
          description: "Two-factor authentication has been enabled for your account"
        });
      } else {
        toast({
          title: "Verification failed",
          description: "The code you entered is incorrect. Please try again.",
          variant: "destructive"
        });
        setVerificationCode('');
      }
    } catch (error) {
      console.error('TOTP setup error:', error);
      toast({
        title: "Setup error",
        description: "An error occurred during 2FA setup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (window.confirm("Are you sure you want to generate a new secret? You'll need to reconfigure your authenticator app.")) {
      generateSecret();
      setVerificationCode('');
      toast({
        title: "Secret regenerated",
        description: "A new secret key has been generated"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Set Up Two-Factor Authentication</h2>
        <p className="text-muted-foreground mb-6">
          Enhance your account security with 2FA
        </p>
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">1. Scan QR Code</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                
                <div className="flex justify-center bg-white p-4 rounded-lg mb-4">
                  {uri ? (
                    <QRCodeSVG value={uri} size={200} />
                  ) : (
                    <div className="flex items-center justify-center w-[200px] h-[200px]">
                      <QrCode className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">2. Manual Setup</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  If you can't scan the QR code, enter this secret key manually in your app:
                </p>
                
                <div className="relative mb-4">
                  <Label htmlFor="secret-key">Secret Key</Label>
                  <div className="flex mt-1.5">
                    <Input 
                      id="secret-key"
                      value={secret}
                      readOnly
                      className="font-mono tracking-wider"
                      onClick={() => handleCopySecret()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="ml-2"
                      onClick={handleCopySecret}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  className="mb-2"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate New Secret
                </Button>
                
                <p className="text-xs text-muted-foreground mt-2">
                  Use "CypherVault" as the account name if prompted
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-2">3. Verify Setup</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter the 6-digit code from your authenticator app to verify the setup
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  maxLength={6}
                  className="text-center text-xl tracking-widest"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="w-full"
                >
                  Cancel
                </Button>
                
                <Button 
                  type="button" 
                  onClick={handleVerify}
                  disabled={verificationCode.length !== 6 || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Enable 2FA'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TOTPSetup; 