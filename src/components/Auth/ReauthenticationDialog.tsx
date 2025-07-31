import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Key, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { logAuditEvent } from '@/lib/auditLogger';

export type SensitiveAction = 
  | 'delete_account'
  | 'change_masterkey'
  | 'disable_2fa'
  | 'export_vault'
  | 'change_email'
  | 'change_password';

interface ReauthenticationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: SensitiveAction; 
  onReauthComplete: (password: string) => void;
}

const ReauthenticationDialog: React.FC<ReauthenticationDialogProps> = ({
  open,
  onOpenChange,
  action,
  onReauthComplete
}) => {
  const [password, setPassword] = useState('');
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const getActionTitle = (): string => {
    switch (action) {
      case 'delete_account': return 'Delete Account';
      case 'change_masterkey': return 'Change Master Key';
      case 'disable_2fa': return 'Disable Two-Factor Authentication';
      case 'export_vault': return 'Export Vault Data';
      case 'change_email': return 'Change Email Address';
      case 'change_password': return 'Change Password';
      default: return 'Confirm Your Identity';
    }
  };

  const getActionDescription = (): string => {
    switch (action) {
      case 'delete_account': 
        return 'Deleting your account is a permanent action. Please enter your password to confirm.';
      case 'change_masterkey': 
        return 'Changing your master key requires password verification for security.';
      case 'disable_2fa': 
        return 'Disabling two-factor authentication reduces your account security. Please confirm your password.';
      case 'export_vault': 
        return 'Exporting your vault data requires verification for security reasons.';
      case 'change_email': 
        return 'Changing your email address requires password verification.';
      case 'change_password': 
        return 'Please enter your current password to proceed with password change.';
      default: 
        return 'This action requires additional verification. Please enter your password.';
    }
  };

  const getActionIcon = () => {
    switch (action) {
      case 'delete_account': 
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'change_masterkey': 
        return <Key className="h-5 w-5 text-orange-500" />;
      case 'disable_2fa': 
      case 'export_vault': 
      case 'change_email': 
      case 'change_password': 
      default: 
        return <Lock className="h-5 w-5 text-primary" />;
    }
  };

  const handleReauthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !currentUser.email) {
      setError('No user is logged in');
      return;
    }
    
    if (!password) {
      setError('Password is required');
      return;
    }
    
    setIsReauthenticating(true);
    setError(null);
    
    try {
      // Create the credential
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password
      );
      
      // Reauthenticate the user
      await reauthenticateWithCredential(currentUser, credential);
      
      // Log the event
      await logAuditEvent(currentUser.uid, 'login_success', `Reauthenticated for ${action}`);
      
      // Call the callback with the password for further actions
      onReauthComplete(password);
      
      // Close the dialog
      onOpenChange(false);
      
      // Clear the password field
      setPassword('');
      
      toast({
        title: 'Verification successful',
        description: 'Your identity has been confirmed',
      });
    } catch (error: any) {
      console.error('Reauthentication error:', error);
      
      // Log the failed attempt
      if (currentUser) {
        logAuditEvent(currentUser.uid, 'login_failed', `Failed reauthentication for ${action}`);
      }
      
      setError('Incorrect password. Please try again.');
      
      toast({
        title: 'Verification failed',
        description: 'Unable to verify your identity',
        variant: 'destructive',
      });
    } finally {
      setIsReauthenticating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getActionIcon()}
            {getActionTitle()}
          </DialogTitle>
          <DialogDescription>
            {getActionDescription()}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleReauthenticate} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
          
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setPassword('');
                setError(null);
              }}
              disabled={isReauthenticating}
            >
              Cancel
            </Button>
            
            <Button 
              type="submit" 
              disabled={!password || isReauthenticating}
              variant={action === 'delete_account' ? 'destructive' : 'default'}
            >
              {isReauthenticating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReauthenticationDialog; 