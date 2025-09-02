import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/AuthContext';
import * as cryptoUtils from '@/lib/cryptoUtils';
import PasswordList, { PasswordEntry } from '@/components/Vault/PasswordList';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import MasterkeyForm from '@/components/Auth/MasterkeyForm';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as secureStorage from '@/lib/secureStorage';
import crypto from 'crypto';

const Vault: React.FC = () => {
  const { isAuthenticated, vaultUnlocked, masterKey, user, unlockVault } = useAuth();
  const { toast } = useToast();
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<PasswordEntry | null>(null);
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});

  // Check vault status on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated && !vaultUnlocked) {
      console.log('Vault is locked, waiting for unlock...');
      setLoading(false);
    } else if (isAuthenticated && vaultUnlocked && masterKey) {
      console.log('Vault is unlocked, loading passwords...');
      setLoading(true);
    }
  }, [isAuthenticated, vaultUnlocked, masterKey]);

  // Add this effect to monitor vault status
  useEffect(() => {
    const checkVaultStatus = async () => {
      if (!user) {
        return;
      }

      // Check if master key is available in secure storage
      const storedMasterKey = secureStorage.secureGet('masterKey');
      const hasMasterKey = !!storedMasterKey;
      
      // If we have a master key, load passwords
      if (hasMasterKey) {
        await loadPasswords();
      }
    };

    checkVaultStatus();
  }, [user]);

  // Load passwords from Firestore
  const loadPasswords = async () => {
    try {
      if (!user || !vaultUnlocked) {
        setPasswords([]);
        return;
      }

      // Get the master key from secure storage
      const masterKey = secureStorage.secureGet('masterKey');
      if (!masterKey) {
        console.error('Master key not found in secure storage');
        setPasswords([]);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (!userData || !userData.vault) {
        setPasswords([]);
        return;
      }

      // Decrypt the vault data
      const decryptedData = await cryptoUtils.decryptData(userData.vault, masterKey);
      const vaultData = JSON.parse(decryptedData);

      if (!vaultData.passwords || !Array.isArray(vaultData.passwords)) {
        setPasswords([]);
        return;
      }

      setPasswords(vaultData.passwords);
      setLoading(false);
    } catch (error) {
      console.error('Error loading passwords:', error);
      setPasswords([]);
      setError('Failed to load passwords. Please try again.');
      setLoading(false);
    }
  };

  // Add a new password
  const handleAddPassword = async (newPassword: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (!vaultUnlocked) {
        toast({
          title: "Vault Locked",
          description: "Please unlock your vault before adding passwords",
          variant: "destructive"
        });
        return;
      }

      // Get the master key from secure storage
      const masterKey = secureStorage.secureGet('masterKey');
      if (!masterKey) {
        toast({
          title: "Error",
          description: "Master key not found. Please unlock your vault again.",
          variant: "destructive"
        });
        return;
      }

      // Create the password entry with timestamps
      const passwordEntry: PasswordEntry = {
        ...newPassword,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add to local state first
      setPasswords(prev => [...prev, passwordEntry]);

      // Save to Firestore
      const userDoc = await getDoc(doc(db, 'users', user!.uid));
      const userData = userDoc.data();

      if (!userData || !userData.vault) {
        throw new Error('Vault data not found');
      }

      // Decrypt existing vault data
      const decryptedData = await cryptoUtils.decryptData(userData.vault, masterKey);
      const vaultData = JSON.parse(decryptedData);

      // Add new password
      vaultData.passwords.push(passwordEntry);

      // Re-encrypt and save
      const encryptedVault = await cryptoUtils.encryptData(JSON.stringify(vaultData), masterKey);
      await updateDoc(doc(db, 'users', user!.uid), {
        vault: encryptedVault,
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "Success",
        description: "Password added successfully"
      });
    } catch (error) {
      console.error('Error adding password:', error);
      toast({
        title: "Error",
        description: "Failed to add password. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Update an existing password
  const handleUpdatePassword = async (id: string, updatedFields: Partial<PasswordEntry>) => {
    try {
      if (!vaultUnlocked) {
        toast({
          title: "Vault Locked",
          description: "Please unlock your vault before updating passwords",
          variant: "destructive"
        });
        return;
      }

      // Get the master key from secure storage
      const masterKey = secureStorage.secureGet('masterKey');
      if (!masterKey) {
        toast({
          title: "Error",
          description: "Master key not found. Please unlock your vault again.",
          variant: "destructive"
        });
        return;
      }

      // Get the user's vault data
      const userDoc = await getDoc(doc(db, 'users', user!.uid));
      const userData = userDoc.data();

      if (!userData || !userData.vault) {
        throw new Error('Vault data not found');
      }

      // Decrypt existing vault data
      const decryptedData = await cryptoUtils.decryptData(userData.vault, masterKey);
      const vaultData = JSON.parse(decryptedData);

      // Update the password in the vault data
      const passwordIndex = vaultData.passwords.findIndex((p: PasswordEntry) => p.id === id);
      if (passwordIndex === -1) {
        throw new Error('Password not found');
      }

      vaultData.passwords[passwordIndex] = {
        ...vaultData.passwords[passwordIndex],
        ...updatedFields,
        updatedAt: new Date().toISOString()
      };

      // Re-encrypt and save
      const encryptedVault = await cryptoUtils.encryptData(JSON.stringify(vaultData), masterKey);
      await updateDoc(doc(db, 'users', user!.uid), {
        vault: encryptedVault,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setPasswords(prev => prev.map(password => 
        password.id === id 
          ? { ...password, ...updatedFields, updatedAt: new Date().toISOString() }
          : password
      ));

      toast({
        title: "Success",
        description: "Password updated successfully"
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Delete a password
  const handleDeletePassword = (id: string) => {
    setConfirmDelete(id);
  };

  const confirmDeletePassword = async () => {
    if (!confirmDelete || !user) return;
    
    try {
      if (!vaultUnlocked) {
        toast({
          title: "Vault Locked",
          description: "Please unlock your vault before deleting passwords",
          variant: "destructive"
        });
        return;
      }

      // Get the master key from secure storage
      const masterKey = secureStorage.secureGet('masterKey');
      if (!masterKey) {
        toast({
          title: "Error",
          description: "Master key not found. Please unlock your vault again.",
          variant: "destructive"
        });
        return;
      }

      // Get the user's vault data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (!userData || !userData.vault) {
        throw new Error('Vault data not found');
      }

      // Decrypt existing vault data
      const decryptedData = await cryptoUtils.decryptData(userData.vault, masterKey);
      const vaultData = JSON.parse(decryptedData);

      // Remove the password from the vault data
      vaultData.passwords = vaultData.passwords.filter((p: PasswordEntry) => p.id !== confirmDelete);

      // Re-encrypt and save
      const encryptedVault = await cryptoUtils.encryptData(JSON.stringify(vaultData), masterKey);
      await updateDoc(doc(db, 'users', user.uid), {
        vault: encryptedVault,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setPasswords(prev => prev.filter(password => password.id !== confirmDelete));
      
      const passwordToDelete = passwords.find(p => p.id === confirmDelete);
      setConfirmDelete(null);
      
      toast({
        title: "Success",
        description: `"${passwordToDelete?.title || 'Password'}" has been deleted`
      });
    } catch (error) {
      console.error('Error deleting password:', error);
      toast({
        title: "Error",
        description: "Failed to delete password. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Function to decrypt a password for viewing
  const decryptPassword = async (id: string) => {
    if (!vaultUnlocked) {
      return "";
    }
    
    // If already decrypted, return from cache
    if (decryptedPasswords[id]) {
      return decryptedPasswords[id];
    }
    
    try {
      // Get the master key from secure storage
      const masterKey = secureStorage.secureGet('masterKey');
      if (!masterKey) {
        console.error("No master key available");
        return "";
      }

      // Find the entry
      const entry = passwords.find(entry => entry.id === id);
      if (!entry) {
        console.error("Password entry not found:", id);
        return "";
      }
      
      // Cache the decrypted password
      setDecryptedPasswords(prev => ({
        ...prev,
        [id]: entry.password
      }));
      
      return entry.password;
    } catch (error) {
      console.error("Failed to decrypt password:", error);
      return "";
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!vaultUnlocked) {
    return (
      <div className="container mx-auto p-3 sm:p-4 max-w-md">
        <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border border-border">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">Unlock Your Vault</h2>
          <p className="text-muted-foreground mb-4 sm:mb-6 text-center text-sm sm:text-base">
            Enter your account password to access your passwords
          </p>
          <MasterkeyForm onSuccess={() => {
            console.log('Vault unlocked successfully');
            setLoading(true);
          }} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-pulse-slow text-center">
          <span className="text-lg">Decrypting your vault...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-center max-w-md">
          <h2 className="text-xl text-destructive mb-2">Error</h2>
          <p className="mb-4">{error}</p>
          <button 
            className="px-4 py-2 bg-primary text-white rounded-md"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 max-w-6xl">
      <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border border-border">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Your Passwords</h1>
        
        {error && (
          <div className="bg-destructive/15 text-destructive rounded-md p-3 mb-4">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center h-[50vh]">
            <div className="flex flex-col items-center">
              <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-3"></div>
              <p className="text-muted-foreground">Loading your passwords...</p>
            </div>
          </div>
        ) : (
          <PasswordList
            passwords={passwords}
            onAddPassword={handleAddPassword}
            onUpdatePassword={handleUpdatePassword}
            onDeletePassword={handleDeletePassword}
            decryptPassword={decryptPassword}
          />
        )}
      </div>
      
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent aria-describedby="delete-dialog-description">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Password?</AlertDialogTitle>
            <AlertDialogDescription id="delete-dialog-description">
              This will permanently delete this password from your vault. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePassword} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Vault;
