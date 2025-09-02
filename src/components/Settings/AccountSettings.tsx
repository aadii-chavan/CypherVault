import React, { useState, useEffect } from 'react';
import { Shield, Mail, Lock, Key, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const AccountSettings: React.FC = () => {
  const { 
    user, 
    updateUserDisplayName, 
    updateEmail, 
    updatePassword,
    autoLockTime = 300000, // Set default value
    updateAutoLockTime,
    deleteAccount,
    signOut
  } = useAuth();
  const { toast } = useToast();
  
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  // Masterkey management removed
  const [selectedAutoLockTime, setSelectedAutoLockTime] = useState(autoLockTime || 300000);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  // Masterkey management removed
  
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all password fields",
        variant: "destructive"
      });
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "The new passwords you entered do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setPasswordLoading(true);
      console.log("updatePassword is:", typeof updatePassword);
      
      if (typeof updatePassword !== 'function') {
        throw new Error("Password update function is not available");
      }
      
      await updatePassword(currentPassword, newPassword);
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated",
      });
    } catch (error: any) {
      console.error("Password update error:", error);
      
      let errorMessage = "Failed to update password. Please try again.";
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect current password. Please try again.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The new password is too weak. Please use a stronger password.";
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = "For security, please log out and log back in before changing your password.";
        // Sign the user out to force re-authentication
        try {
          await signOut();
        } catch (signOutError) {
          console.error("Sign out failed:", signOutError);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setPasswordLoading(false);
    }
  };
  
  // Masterkey update flow removed
  
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast({
        title: "Error",
        description: "Please enter your password",
        variant: "destructive",
      });
      return;
    }

    try {
      setDeleteLoading(true);
      console.log("deleteAccount is:", typeof deleteAccount, deleteAccount);
      
      if (typeof deleteAccount === 'function') {
        await deleteAccount(deletePassword);
        setShowDeleteConfirm(false);
      } else {
        throw new Error("Delete account function is not available");
      }
    } catch (error: any) {
      console.error("Delete account error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };
  
  const handleUpdateAutoLockTime = async (time: string) => {
    try {
      const timeInMs = parseInt(time);
      if (!isNaN(timeInMs)) {
        await updateAutoLockTime(timeInMs);
        setSelectedAutoLockTime(timeInMs);
        
        toast({
          title: 'Auto-lock Updated',
          description: 'Auto-lock time has been updated',
          duration: 2000,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="vault">Vault Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                View your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <Label>Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-muted-foreground" />
                  <span>{user?.email}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Email addresses cannot be changed after account creation
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                </div>
                
                <Button 
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Enhance the security of your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <h3 className="text-lg font-medium">Change Password</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                    <Input
                      id="confirmNewPassword"
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
              {/* Masterkey settings removed */}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="vault">
          <Card>
            <CardHeader>
              <CardTitle>Auto-lock Settings</CardTitle>
              <CardDescription>
                Configure when your vault automatically locks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Auto-lock Timer</Label>
                  <RadioGroup
                    value={selectedAutoLockTime.toString()}
                    onValueChange={handleUpdateAutoLockTime}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="0" id="never" />
                      <Label htmlFor="never">Never</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="300000" id="5min" />
                      <Label htmlFor="5min">5 minutes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="900000" id="15min" />
                      <Label htmlFor="15min">15 minutes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1800000" id="30min" />
                      <Label htmlFor="30min">30 minutes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="3600000" id="1hour" />
                      <Label htmlFor="1hour">1 hour</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="7200000" id="2hours" />
                      <Label htmlFor="2hours">2 hours</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Security Note</AlertTitle>
                  <AlertDescription>
                    For security reasons, we recommend setting an auto-lock timer. This will automatically lock your vault after a period of inactivity.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers, including your vault and passwords.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                All your stored passwords and secure data will be deleted permanently.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Enter your password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Your current password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button 
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete Account"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountSettings;
