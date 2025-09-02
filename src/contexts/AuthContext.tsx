import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User,
  onAuthStateChanged,
  UserCredential,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import * as cryptoUtils from '@/lib/cryptoUtils';
import * as totpUtils from '@/lib/totpUtils';
import { logAuditEvent } from '@/lib/auditLogger';
import { toast } from "sonner";
import * as stealthModeUtils from '@/lib/stealthModeUtils';
import * as secureStorage from '@/lib/secureStorage';
import * as encryption from '@/lib/encryption';
import { Timestamp } from 'firebase/firestore';

// Add this helper function near the top of the file
const DEBUG_MODE = process.env.NODE_ENV !== 'production';

const debugLog = (...args: any[]) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  unlockVault: (accountPassword: string) => Promise<boolean>;
  lockVault: () => void;
  vaultUnlocked: boolean;
  masterKey: string | null;
  error: string | null;
  setError: (error: string | null) => void;
  setupTwoFactor: () => Promise<string>;
  verifyTwoFactor: (code: string) => Promise<boolean>;
  disableTwoFactor: () => Promise<boolean>;
  twoFactorEnabled: boolean;
  isAuthenticated: boolean;
  autoLockTime?: number;
  updateAutoLockTime?: (time: number) => Promise<void>;
  isTrustedDevicesEnabled: () => Promise<boolean>;
  isCurrentDeviceTrusted: () => Promise<boolean>;
  trustCurrentDevice: (deviceName?: string) => Promise<boolean>;
  requireTrustedDevice: boolean;
  deleteAccount: (password: string) => Promise<void>;
  saveVaultData: (data: any) => Promise<void>;
  loadVaultData: () => Promise<any>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: async () => {
    throw new Error('Not implemented');
  },
  login: async () => {
    throw new Error('Not implemented');
  },
  signOut: async () => {
    throw new Error('Not implemented');
  },
  resetPassword: async () => {
    throw new Error('Not implemented');
  },
  updateEmail: async () => {
    throw new Error('Not implemented');
  },
  updatePassword: async () => {
    throw new Error('Not implemented');
  },
  unlockVault: async () => {
    throw new Error('Not implemented');
  },
  lockVault: () => {},
  vaultUnlocked: false,
  masterKey: null,
  error: null,
  setError: () => {},
  setupTwoFactor: async () => {
    throw new Error('Not implemented');
  },
  verifyTwoFactor: async () => {
    throw new Error('Not implemented');
  },
  disableTwoFactor: async () => {
    throw new Error('Not implemented');
  },
  twoFactorEnabled: false,
  isAuthenticated: false,
  isTrustedDevicesEnabled: async () => {
    throw new Error('Not implemented');
  },
  isCurrentDeviceTrusted: async () => {
    throw new Error('Not implemented');
  },
  trustCurrentDevice: async () => {
    throw new Error('Not implemented');
  },
  requireTrustedDevice: false,
  deleteAccount: async () => {
    throw new Error('Not implemented');
  },
  saveVaultData: async () => {
    throw new Error('Not implemented');
  },
  loadVaultData: async () => {
    throw new Error('Not implemented');
  }
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [masterKey, setMasterKey] = useState<string | null>(null);
  const [autoLockTime, setAutoLockTime] = useState(300000); // 5 minutes default
  const [autoLockTimer, setAutoLockTimer] = useState<NodeJS.Timeout | null>(null);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [requireTrustedDevice, setRequireTrustedDevice] = useState(false);
  const [currentDeviceFingerprint, setCurrentDeviceFingerprint] = useState<string | null>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idleTime, setIdleTime] = useState(0);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add rate limiting state and helpers
  const [unlockAttempts, setUnlockAttempts] = useState<{count: number, lastAttempt: number}>({
    count: 0,
    lastAttempt: 0
  });

  // Add this function before unlockVault
  const checkRateLimit = (): {limited: boolean, remainingSeconds: number} => {
    const now = Date.now();
    const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
    const MAX_ATTEMPTS = 5; // Max 5 attempts in the window
    
    // Reset counter if window has passed
    if (now - unlockAttempts.lastAttempt > RATE_LIMIT_WINDOW) {
      setUnlockAttempts({count: 0, lastAttempt: now});
      return {limited: false, remainingSeconds: 0};
    }
    
    // Check if limit reached
    if (unlockAttempts.count >= MAX_ATTEMPTS) {
      const remainingTime = RATE_LIMIT_WINDOW - (now - unlockAttempts.lastAttempt);
      const remainingSeconds = Math.ceil(remainingTime / 1000);
      return {limited: true, remainingSeconds};
    }
    
    return {limited: false, remainingSeconds: 0};
  };

  // Activity tracking for auto-lock
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
      setIdleTime(0);
    };
    
    // Track user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('click', handleActivity);
    
    // Check idle time every minute
    idleTimerRef.current = setInterval(() => {
      const currentIdleTime = Date.now() - lastActivity;
      setIdleTime(currentIdleTime);
      
      // Auto-lock if idle time exceeds the limit and vault is unlocked
      if (vaultUnlocked && autoLockTime > 0 && currentIdleTime >= autoLockTime) {
        lockVault();
        toast("Vault locked", {
          description: "Your vault has been automatically locked due to inactivity"
        });
      }
    }, 60000); // Check every minute
    
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('click', handleActivity);
      
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
    };
  }, [vaultUnlocked, autoLockTime, lastActivity]);

  // Store current user in a global variable for access by panic mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Store only minimal required information, not the entire user object
      if (currentUser) {
        // Store only the user ID, not the entire user object
        window.cypherVaultCurrentUserId = currentUser.uid;
        
        // Update panic mode data
        stealthModeUtils.updateUserDataForPanic(currentUser.uid);
      } else {
        // Clear the data when user is null
        delete window.cypherVaultCurrentUserId;
      }
    }
  }, [currentUser]);

  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthenticated(!!user);
      setLoading(false);
      
      if (user) {
        try {
          // Initialize stealth mode with user
          await stealthModeUtils.initializeStealthModeWithUser(user.uid);
          
          // Get settings and initialize panic key if enabled
          const settings = await stealthModeUtils.getSettings();
          if (settings?.panicKeyEnabled && settings?.panicKey) {
            await stealthModeUtils.registerPanicKeyListener(settings.panicKey);
          }
        } catch (error) {
          console.error('Error initializing stealth mode:', error);
        }
      } else {
        // Clear stealth mode and panic key when user logs out
        stealthModeUtils.unregisterPanicKeyListener();
      }
    });

    return () => unsubscribe();
  }, []);

  // Reset auto-lock timer when vault is unlocked
  useEffect(() => {
    if (vaultUnlocked && autoLockTime > 0) {
      // Reset last activity timestamp when vault is unlocked
      setLastActivity(Date.now());
      setIdleTime(0);
    }
  }, [vaultUnlocked]);

  // Load 2FA status from Firestore when user logs in
  useEffect(() => {
    const loadTwoFactorStatus = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const userData = userDoc.data();
          if (userData && userData.twoFactorEnabled) {
            setIsTwoFactorEnabled(true);
          } else {
            setIsTwoFactorEnabled(false);
          }
        } catch (error) {
          console.error('Error loading 2FA status:', error);
        }
      }
    };
    loadTwoFactorStatus();
  }, [currentUser]);

  // Add event listener for panic mode to handle vault locking
  useEffect(() => {
    const handlePanicMode = () => {
      // Lock the vault immediately
      lockVault();
      
      // Log event if user is logged in
      if (currentUser) {
        logAuditEvent(
          currentUser.uid,
          'vault_locked',
          'Vault locked via panic mode'
        ).catch(err => console.error('Error logging panic event:', err));
      }
    };
    
    // Add the event listener
    window.addEventListener('lock-vault', handlePanicMode);
    
    // Clean up
    return () => {
      window.removeEventListener('lock-vault', handlePanicMode);
    };
  }, [currentUser]);

  // Generate a simple device identifier
  const generateDeviceId = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const language = navigator.language;
    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    
    // Create a simple hash of device characteristics
    const deviceString = `${userAgent}|${platform}|${language}|${screenResolution}`;
    return cryptoUtils.hashString(deviceString);
  };

  // Replace the old generateFingerprint function
  const generateFingerprint = async () => {
    try {
      return generateDeviceId();
    } catch (error) {
      console.error('Error generating device identifier:', error);
      return null;
    }
  };

  // Load trusted device settings
  useEffect(() => {
    const loadTrustedDeviceSettings = async () => {
      if (!currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        
        if (userData && userData.requireTrustedDevice) {
          setRequireTrustedDevice(userData.requireTrustedDevice);
        }
      } catch (error) {
        console.error('Error loading trusted device settings:', error);
      }
    };
    
    loadTrustedDeviceSettings();
  }, [currentUser]);

  const signUp = async (email: string, password: string, displayName: string) => {
    let firebaseUser = null;
    
    try {
      // First create the user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { user } = userCredential;
      firebaseUser = user;
      
      // Update the user's display name
      await updateProfile(user, {
        displayName: displayName
      });
      
      // Initialize user document with empty vault
      const initialVaultData = {
        passwords: []
      };
      
      // Encrypt the initial vault data with the ACCOUNT PASSWORD
      const encryptedVault = await cryptoUtils.encryptData(JSON.stringify(initialVaultData), password);
      
      // Hash the ACCOUNT PASSWORD for verification (stored as vaultKeyHash)
      const vaultKeyHash = await encryption.hashMasterkey(password);
      
      // Create the user document in Firestore
      try {
        // Validate the encrypted vault format
        if (!encryptedVault || typeof encryptedVault !== 'string') {
          throw new Error("Invalid vault encryption");
        }

        // Validate the vault key hash format
        if (!vaultKeyHash || typeof vaultKeyHash !== 'string' || !vaultKeyHash.includes(':')) {
          throw new Error("Invalid vault key hash");
        }

        const userData = {
          displayName: displayName,
          email: email,
          vault: encryptedVault,
          vaultKeyHash: vaultKeyHash,
          autoLockTime: 300000, // 5 minutes default
          createdAt: new Date().toISOString()
        };

        // Validate all required fields are present and of correct type
        if (!userData.displayName || !userData.email || !userData.vault || !userData.vaultKeyHash) {
          throw new Error("Missing required user data fields");
        }

        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, userData);

        // Log successful user creation
        await logAuditEvent(
          user.uid,
          'user_created',
          'User account created successfully'
        );
      } catch (firestoreError) {
        // If Firestore creation fails, delete the Firebase Auth user and throw the error
        console.error("Firestore user creation failed:", firestoreError);
        
        // Delete the authentication user since Firestore document failed
        await user.delete();
        
        throw new Error("Failed to create user account. Please try again.");
      }
      
      // Set the current user and authentication state
      setCurrentUser(user);
      setIsAuthenticated(true);
      
      toast.success("Account created", {
        description: "Your account has been created successfully"
      });
      
      navigate('/unlock');
      
      return userCredential;
    } catch (error) {
      console.error("Signup failed:", error);
      
      // If there's an error and we created a Firebase user, try to delete it
      if (firebaseUser) {
        try {
          await firebaseUser.delete();
          console.log("Deleted Firebase user after signup failure");
        } catch (deleteError) {
          console.error("Failed to delete user after signup error:", deleteError);
        }
      }
      
      toast.error("Error", {
        description: error.message || "Failed to create account. Please try again."
      });
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Sign in with Firebase Auth
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      // Set the user state
      setCurrentUser(user);
      
      // Check if 2FA is enabled
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (userData?.twoFactorEnabled) {
        setIsTwoFactorEnabled(true);
        
        // Redirect to 2FA verification page
        // Note: We consider the user partially authenticated at this point
        // but they need to complete 2FA before being fully authenticated
        return user;
      }
      
      // If no 2FA, user is authenticated
      setIsAuthenticated(true);
      
      // Log successful login
      try {
        await logAuditEvent(
          user.uid,
          'user_login',
          'User logged in successfully'
        );
      } catch (logError) {
        console.error('Error logging login:', logError);
        // Don't fail the login just because logging failed
      }
      
      return user;
    } catch (error: any) {
      console.error("Login error:", error.code, error.message);
      
      // Note: We're not showing a toast here because the LoginForm component 
      // already handles showing error messages for login failures
      
      return null;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setVaultUnlocked(false);
      // Clear master key from secure storage
      secureStorage.secureRemove('masterKey');
      toast.success("Logged out", {
        description: "You have been logged out successfully"
      });
      navigate('/login');
    } catch (error: any) {
      console.error("Sign out failed:", error.message);
      toast.error("Error", {
        description: error.message
      });
    }
  };

  /**
   * Migrates the vault encryption to the current standard
   * Call this after successfully unlocking the vault
   */
  const migrateVaultEncryption = async (userId: string, decryptedData: string, masterPassword: string): Promise<void> => {
    try {
      // Re-encrypt with the Web Crypto API (current standard)
      const encryptedVault = await cryptoUtils.encryptData(decryptedData, masterPassword);
      
      // Update the encrypted vault in Firestore
      await updateDoc(doc(db, 'users', userId), {
        vault: encryptedVault,
        lastMigrated: new Date().toISOString(),
        encryptionVersion: 'web-crypto-aes-gcm'
      });
      
      console.log('Vault encryption migrated to current standard');
    } catch (error) {
      console.error('Failed to migrate vault encryption:', error);
      // Don't throw - this is a non-critical operation
    }
  };

  const unlockVault = async (accountPassword: string): Promise<boolean> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Check rate limiting
    const now = Date.now();
    const { limited, remainingSeconds } = checkRateLimit();
    if (limited) {
      throw new Error(`Too many failed attempts. Please try again in ${Math.ceil(remainingSeconds / 60)} minutes.`);
    }

    try {
      // Get user vault settings
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }

      const userData = userDoc.data();
      
      // If vault is not initialized, initialize it
      if (!userData.vaultKeyHash) {
        // Initialize empty vault
        const initialVaultData = {
          passwords: []
        };
        
        // Encrypt the initial vault data
        const encryptedVault = await cryptoUtils.encryptData(JSON.stringify(initialVaultData), accountPassword);
        
        // Hash the account password
        const vaultKeyHash = await encryption.hashMasterkey(accountPassword);
        
        // Update user document with initialized vault
        await updateDoc(doc(db, 'users', currentUser.uid), {
          vault: encryptedVault,
          vaultKeyHash: vaultKeyHash,
          autoLockTime: 300000, // 5 minutes default
          updatedAt: new Date().toISOString()
        });
        
        // Set vault unlocked state and master key
        setVaultUnlocked(true);
        setMasterKey(accountPassword);
        
        // Store master key securely with auto-lock timeout
        secureStorage.secureSet('masterKey', accountPassword, 300000);
        
        // Update last activity timestamp
        setLastActivity(Date.now());
        
        // Log successful initialization
        await logAuditEvent(
          currentUser.uid,
          'vault_initialized',
          'Vault initialized successfully'
        );
        
        return true;
      }

      // Verify using account password
      const isValid = await encryption.verifyMasterkey(accountPassword, userData.vaultKeyHash);
      
      if (isValid) {
        // Clear failed attempts on success
        setUnlockAttempts({ count: 0, lastAttempt: 0 });
        
        // Set vault unlocked state and master key
        setVaultUnlocked(true);
        setMasterKey(accountPassword);
        
        // Store master key securely with auto-lock timeout
        const autoLockTimeout = userData.autoLockTimeout || 30 * 60 * 1000; // Default 30 minutes
        secureStorage.secureSet('masterKey', accountPassword, autoLockTimeout);
        
        // Update last activity timestamp
        setLastActivity(Date.now());
        
        // Log successful unlock
        await logAuditEvent(
          currentUser.uid,
          'vault_unlocked',
          'Vault unlocked successfully'
        );
        
        return true;
      } else {
        // Log failed attempt
        setUnlockAttempts({ 
          count: unlockAttempts.count + 1, 
          lastAttempt: now 
        });
        
        // Log failed unlock attempt
        await logAuditEvent(
          currentUser.uid,
          'vault_unlock_failed',
          'Failed vault unlock attempt with incorrect account password'
        );
        
        throw new Error('Invalid password');
      }
    } catch (error) {
      console.error('Vault unlock error:', error);
      throw error;
    }
  };

  const lockVault = () => {
    setVaultUnlocked(false);
    setMasterKey(null);
    secureStorage.secureRemove('masterKey');
    if (autoLockTimer) {
      clearTimeout(autoLockTimer);
      setAutoLockTimer(null);
    }
  };

  const updateUserDisplayName = async (displayName: string) => {
    if (!currentUser) return;

    try {
      await updateProfile(currentUser, {
        displayName: displayName,
      });

      await setDoc(doc(db, 'users', currentUser.uid), {
        displayName: displayName,
      }, { merge: true });

      setCurrentUser({
        ...currentUser,
        displayName: displayName,
      });
      
      toast.success("Profile updated", {
        description: "Your profile has been updated successfully"
      });
    } catch (error: any) {
      console.error("Failed to update display name:", error.message);
      toast.error("Error", {
        description: error.message
      });
    }
  };

  const updateUserEmail = async (newEmail: string): Promise<void> => {
    if (!currentUser) throw new Error("No user is logged in");

    try {
      await updateEmail(currentUser, newEmail);
      
      await updateDoc(doc(db, 'users', currentUser.uid), {
        email: newEmail,
      });
      
      toast.success("Email updated", {
        description: "Your email has been updated successfully"
      });
    } catch (error: any) {
      console.error("Failed to update email:", error.message);
      toast.error("Error", {
        description: error.message
      });
      throw error;
    }
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!currentUser) throw new Error("No user is logged in");

    try {
      // Basic password validation
      if (newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }
      
      // Check for at least one special character, number, or uppercase letter
      const hasSpecialOrNumberOrUpper = /[A-Z0-9!@#$%^&*(),.?":{}|<>]/.test(newPassword);
      if (!hasSpecialOrNumberOrUpper) {
        throw new Error("Password must contain at least one uppercase letter, number, or special character");
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        currentPassword
      );
      
      try {
        await reauthenticateWithCredential(currentUser, credential);
      } catch (authError: any) {
        console.error("Authentication error:", authError);
        
        if (authError.code === 'auth/wrong-password') {
          throw new Error("Current password is incorrect");
        } else if (authError.code === 'auth/too-many-requests') {
          throw new Error("Too many failed attempts. Please try again later");
        } else if (authError.code === 'auth/requires-recent-login') {
          throw new Error("For security reasons, please log out and log back in before changing your password");
        } else {
          throw new Error(authError.message || "Authentication failed");
        }
      }

      // Update password
      await updatePassword(currentUser, newPassword);
      
      // Log this important security event
      await logAuditEvent(
        currentUser.uid,
        'password_updated',
        'Password was successfully updated'
      );
      
      toast.success("Password updated", {
        description: "Your password has been updated successfully"
      });
    } catch (error: any) {
      console.error("Failed to update password:", error);
      
      // Pass the error message up to the caller
      throw error;
    }
  };

  const updateUserMasterkey = async (currentMasterkey: string, newMasterkey: string): Promise<boolean> => {
    console.log("🔑 Starting masterkey update with inputs:", { 
      currentLength: currentMasterkey?.length || 0,
      newLength: newMasterkey?.length || 0,
      vaultUnlocked
    });
    
    try {
      if (!currentUser) {
        console.error("❌ No user logged in");
        throw new Error("You must be logged in to update your master key");
      }
      
      if (!vaultUnlocked) {
        console.error("❌ Vault is not unlocked");
        throw new Error("Vault must be unlocked to update master key");
      }
      
      // Get the master key from state and secure storage
      const memoryMasterKey = masterKey;
      const storedMasterKey = secureStorage.secureGet('masterKey');
      
      console.log("🔍 Checking keys:", { 
        memoryKeyAvailable: !!memoryMasterKey,
        storedKeyAvailable: !!storedMasterKey,
        inputMatchesMemory: currentMasterkey === memoryMasterKey,
        inputMatchesStored: currentMasterkey === storedMasterKey
      });
      
      // Try validating against the master key hash in Firestore
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      
      if (!userData || !userData.vaultKeyHash) {
        console.error("❌ No vault key hash found in user data");
        throw new Error("Could not verify your master key");
      }
      
      // Verify using hash
      const isValidHash = encryption.verifyMasterkey(currentMasterkey, userData.vaultKeyHash);
      console.log("🔐 Masterkey validation result:", isValidHash);
      
      if (!isValidHash) {
        console.error("❌ Current masterkey failed hash validation");
        return false;
      }
      
      // First, try to load the vault data with the current master key
      console.log("📂 Loading vault data");
      let vaultData;
      
      try {
        // Try to decrypt directly with provided master key
        const vaultCiphertext = userData.vault;
        const decryptedData = await cryptoUtils.decryptData(vaultCiphertext, currentMasterkey);
        vaultData = JSON.parse(decryptedData);
        console.log("✅ Direct decryption successful");
      } catch (decryptError) {
        console.error("❌ Direct decryption failed:", decryptError);
        
        // Try fallback to loadVaultData
        vaultData = await loadVaultData();
        if (!vaultData) {
          console.error("❌ Fallback vault loading failed");
          throw new Error("Failed to decrypt vault with current master key");
        }
        console.log("✅ Fallback vault loading successful");
      }
      
      if (!vaultData) {
        console.error("❌ No vault data found");
        throw new Error("Failed to load vault data");
      }
      
      console.log("🔄 Re-encrypting vault data with new key");
      const vaultJson = JSON.stringify(vaultData);
      console.log("📊 Vault data size:", vaultJson.length, "characters");
      
      // Re-encrypt the vault data with the new master key
      const newEncryptedVault = await cryptoUtils.encryptData(vaultJson, newMasterkey);
      console.log("✅ Re-encryption successful");
      
      // Update all necessary data in Firestore
      console.log("💾 Updating Firestore");
      const userDocRef = doc(db, 'users', currentUser.uid);
      
      // Update the vault with the new encryption
      await updateDoc(userDocRef, {
        vault: newEncryptedVault
      });
      
      // Update the vault key hash
      const newHashedKey = encryption.hashMasterkey(newMasterkey);
      await updateDoc(userDocRef, {
        vaultKeyHash: newHashedKey
      });
      
      // Update the master key in memory and secure storage
      console.log("🔄 Updating local storage");
      setMasterKey(newMasterkey);
      secureStorage.secureSet('masterKey', newMasterkey, autoLockTime);
      
      console.log("✅ Master key update completed successfully");
      
      // Log this important security event
      await logAuditEvent(
        currentUser.uid,
        'masterkey_updated',
        'Master key was successfully updated'
      );
      
      toast.success("Master key updated", {
        description: "Your master key has been updated successfully"
      });
      
      return true;
    } catch (error: any) {
      console.error("❌ Master key update failed:", error);
      toast.error("Error", {
        description: error.message || "Failed to update master key. Please try again."
      });
      return false;
    }
  };

  const updateAutoLockTime = async (time: number) => {
    if (!currentUser) return;

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        autoLockTime: time
      });

      setAutoLockTime(time);
      
      toast.success("Auto-lock updated", {
        description: `Your vault will now auto-lock after ${time / 60000} minutes of inactivity`
      });
    } catch (error: any) {
      console.error("Failed to update auto-lock time:", error.message);
      toast.error("Error", {
        description: error.message
      });
    }
  };

  const saveVaultData = async (data: any) => {
    if (!currentUser || !vaultUnlocked || !masterKey) {
      throw new Error("You must be authenticated and have your vault unlocked to save data");
    }
    
    try {
      // Encrypt the data with the master key
      const encryptedData = await cryptoUtils.encryptData(JSON.stringify(data), masterKey);
      
      // Save the encrypted data to Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        vault: encryptedData,
        updatedAt: new Date().toISOString()
      });
      
      // Log the update
      await logAuditEvent(currentUser.uid, 'vault_update', 'Vault data updated');
      
      return true;
    } catch (error) {
      console.error("Error saving vault data:", error);
      throw error;
    }
  };

  const loadVaultData = async () => {
    if (!currentUser || !vaultUnlocked) {
      return null;
    }
    
    try {
      // Regular vault loading process
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      
      if (!userData || !userData.vault) {
        return null;
      }
      
      // Get the master key from secure storage instead of state
      const retrievedKey = secureStorage.secureGet('masterKey');
      if (!retrievedKey) {
        console.error('Master key not available in secure storage');
        return null;
      }
      
      // Decrypt the vault with the master key from secure storage
      const decryptedData = await cryptoUtils.decryptData(userData.vault, retrievedKey);
      const vaultData = JSON.parse(decryptedData);
      
      // Log the access
      await logAuditEvent(currentUser.uid, 'vault_access', 'Vault accessed');
      
      return vaultData;
    } catch (error) {
      console.error("Error loading vault data:", error);
      return null;
    }
  };

  const deleteAccount = async (password: string) => {
    if (!currentUser) {
      throw new Error("No user is logged in");
    }

    try {
      // Re-authenticate the user first
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        password
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Store user ID before deletion for cleanup
      const userId = currentUser.uid;

      // Only attempt to delete the user document
      // Skip subcollections (could cause permission issues)
      try {
        const userDocRef = doc(db, 'users', userId);
        await deleteDoc(userDocRef);
      } catch (firestoreError) {
        console.log("Firestore deletion error (proceeding anyway):", firestoreError);
        // Continue with account deletion even if Firestore deletion fails
      }

      // Delete the Firebase Auth account 
      // This is the most important part
      await currentUser.delete();

      // Clear all secure storage
      secureStorage.clearAllSecureData();
      secureStorage.clearAllSecureSessionData();

      // Clear local state
      setCurrentUser(null);
      setIsAuthenticated(false);
      setVaultUnlocked(false);
      setMasterKey(null);
      setIsTwoFactorEnabled(false);
      setTwoFactorSecret(null);
      setRequireTrustedDevice(false);

      // Show success message
      toast.success("Account deleted", {
        description: "Your account has been permanently deleted"
      });

      // Navigate to home page
      navigate('/');
    } catch (error: any) {
      console.error("Account deletion failed:", error);
      
      // Handle specific error cases
      if (error.code === 'auth/wrong-password') {
        toast.error("Incorrect Password", {
          description: "The password you entered is incorrect. Please try again."
        });
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error("Recent Login Required", {
          description: "For security, please log out and log back in before deleting your account."
        });
        // Sign the user out to force re-authentication
        await signOut();
      } else {
        toast.error("Error", {
          description: error.message || "Failed to delete account. Please try again."
        });
      }
      
      throw error;
    }
  };

  // New function to verify TOTP code during login
  const verifyTwoFactor = async (code: string): Promise<boolean> => {
    try {
      if (!currentUser) throw new Error("No user is logged in");
      
      // Get the encrypted TOTP secret from Firestore
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      
      if (!userData || !userData.twoFactorSecret || !masterKey) {
        throw new Error("Two-factor authentication data not found");
      }
      
      // Decrypt the TOTP secret using the user's master key
      const decryptedSecret = await totpUtils.decryptTOTPSecret(userData.twoFactorSecret, masterKey);
      
      // Store the decrypted secret for future verifications in this session
      setTwoFactorSecret(decryptedSecret);
      
      // Verify the provided code
      const isValid = totpUtils.verifyTOTP(code, decryptedSecret);
      
      if (isValid) {
        // Mark authentication as complete
        setIsAuthenticated(true);
        
        toast.success("Verification successful", {
          description: "Two-factor authentication verified successfully"
        });
        
        navigate('/unlock');
        return true;
      } else {
        toast.error("Verification failed", {
          description: "The code you entered is incorrect. Please try again."
        });
        return false;
      }
    } catch (error: any) {
      console.error("Two-factor verification failed:", error);
      toast.error("Verification error", {
        description: error.message || "Failed to verify two-factor authentication"
      });
      return false;
    }
  };

  // New function to set up 2FA
  const setupTwoFactor = async (secret: string): Promise<void> => {
    try {
      if (!currentUser || !masterKey) {
        throw new Error("User must be logged in and vault must be unlocked");
      }
      
      // Encrypt the TOTP secret with the user's master key
      const encryptedSecret = await totpUtils.encryptTOTPSecret(secret, masterKey);
      
      // Save the encrypted secret to Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        twoFactorEnabled: true,
        twoFactorSecret: encryptedSecret,
        twoFactorSetupDate: new Date().toISOString()
      });
      
      // Update local state
      setIsTwoFactorEnabled(true);
      setTwoFactorSecret(secret); // Store for the current session
      
      // Log the 2FA setup for audit
      await addDoc(collection(db, 'users', currentUser.uid, 'auditLogs'), {
        event: 'two_factor_enabled',
        timestamp: new Date().toISOString(),
        ipAddress: 'client-side',
        userAgent: navigator.userAgent
      });
    } catch (error: any) {
      console.error("Two-factor setup failed:", error);
      throw new Error(error.message || "Failed to set up two-factor authentication");
    }
  };

  // New function to disable 2FA
  const disableTwoFactor = async (password: string): Promise<boolean> => {
    try {
      if (!currentUser) {
        throw new Error("No user is logged in");
      }
      
      // Require re-authentication for security
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        password
      );
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update Firestore to disable 2FA
      await updateDoc(doc(db, 'users', currentUser.uid), {
        twoFactorEnabled: false,
        twoFactorSecret: null
      });
      
      // Update local state
      setIsTwoFactorEnabled(false);
      setTwoFactorSecret(null);
      
      // Log the 2FA disable for audit
      await addDoc(collection(db, 'users', currentUser.uid, 'auditLogs'), {
        event: 'two_factor_disabled',
        timestamp: new Date().toISOString(),
        ipAddress: 'client-side',
        userAgent: navigator.userAgent
      });
      
      toast.success("2FA disabled", {
        description: "Two-factor authentication has been disabled for your account"
      });
      
      return true;
    } catch (error: any) {
      console.error("Two-factor disable failed:", error);
      toast.error("Error", {
        description: error.message || "Failed to disable two-factor authentication"
      });
      return false;
    }
  };

  // Check if trusted devices feature is enabled
  const isTrustedDevicesEnabled = async (): Promise<boolean> => {
    if (!currentUser) return false;
    
    try {
      return await fingerprintUtils.isTrustedDevicesEnabled(currentUser.uid);
    } catch (error) {
      console.error('Error checking trusted devices status:', error);
      return false;
    }
  };
  
  // Check if current device is trusted
  const isCurrentDeviceTrusted = async (): Promise<boolean> => {
    if (!currentUser || !currentDeviceFingerprint) return false;
    
    try {
      return await fingerprintUtils.isDeviceTrusted(currentUser.uid, currentDeviceFingerprint);
    } catch (error) {
      console.error('Error checking device trust status:', error);
      return false;
    }
  };
  
  // Trust the current device
  const trustCurrentDevice = async (): Promise<boolean> => {
    if (!currentUser || !masterKey) {
      toast.error("You must be logged in to trust this device");
      return false;
    }

    try {
      setIsLoading(true);

      // Generate a device fingerprint
      const fingerprint = await fingerprintUtils.generateDeviceFingerprint();
      
      // Get detailed device info
      const deviceInfo = fingerprintUtils.getDeviceInfo();
      
      // Get existing trusted devices to assess risk
      const existingDevices = await fingerprintUtils.getTrustedDevices(currentUser.uid);
      
      // Get geographic data (simplified - in real implementation, use a geolocation API)
      const geoData = { 
        ip: "0.0.0.0", 
        city: Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[1], 
        country: Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[0] 
      };
      
      // Calculate risk score
      const riskAssessment = calculateDeviceRiskScore(deviceInfo, existingDevices, geoData);
      
      // Log device risk assessment
      console.log(`Device risk assessment: Score ${riskAssessment.score}/100`);
      if (riskAssessment.factors.length > 0) {
        console.log(`Risk factors: ${riskAssessment.factors.join(', ')}`);
      }
      
      // Flag device as high risk if score is above threshold
      const isHighRisk = riskAssessment.score > 70;
      
      // Add to trusted devices
      const deviceMetadata = {
        ...deviceInfo,
        riskScore: riskAssessment.score,
        flaggedAsRisky: isHighRisk,
        geoData
      };
      
      const success = await fingerprintUtils.addTrustedDevice(
        currentUser.uid, 
        fingerprint, 
        deviceInfo.name, 
        deviceMetadata
      );
      
      if (success) {
        // Send notification about new device login
        await sendDeviceNotification(
          currentUser.uid, 
          currentUser.email || '', 
          deviceInfo, 
          isHighRisk,
          riskAssessment.factors
        );
        
        // Show success message based on risk assessment
        if (isHighRisk) {
          toast.warning("Device trusted, but flagged as potentially risky. Please verify through email.");
        } else {
          toast.success("This device has been trusted successfully");
        }
        
        // Update local state
        await logAuditEvent(currentUser.uid, "device_trusted", `Device trusted: ${deviceInfo.name}`);
        
        setCurrentDeviceTrusted(true);
        return true;
      } else {
        toast.error("Failed to trust device. Please try again");
        return false;
      }
    } catch (error) {
      console.error("Error trusting device:", error);
      toast.error("An unexpected error occurred");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate risk score for a device
  const calculateDeviceRiskScore = (
    deviceInfo: ReturnType<typeof fingerprintUtils.getDeviceInfo>,
    existingDevices: any[],
    geoData: { ip: string; city?: string; country?: string; } | null
  ): { score: number; factors: string[] } => {
    const riskFactors: string[] = [];
    let baseScore = 0;
    
    // Check if this is the first device (lower risk)
    if (existingDevices.length === 0) {
      baseScore = 20; // Base risk for first device
    } else {
      baseScore = 30; // Base risk for additional devices
      
      // Check for geographic anomalies
      if (geoData && geoData.country) {
        const existingCountries = new Set(
          existingDevices
            .filter(d => d.geoData?.country)
            .map(d => d.geoData.country)
        );
        
        if (existingCountries.size > 0 && !existingCountries.has(geoData.country)) {
          baseScore += 25;
          riskFactors.push(`Login from new country: ${geoData.country}`);
        }
      }
      
      // Check for unusual device type
      const existingTypes = new Set(existingDevices.map(d => d.deviceType));
      if (!existingTypes.has(deviceInfo.deviceType)) {
        baseScore += 10;
        riskFactors.push(`New device type: ${deviceInfo.deviceType}`);
      }
      
      // Check for unusual browser
      const existingBrowsers = new Set(existingDevices.map(d => d.browser));
      if (!existingBrowsers.has(deviceInfo.browser)) {
        baseScore += 10;
        riskFactors.push(`New browser: ${deviceInfo.browser}`);
      }
      
      // Check for unusual OS
      const existingOS = new Set(existingDevices.map(d => d.os));
      if (!existingOS.has(deviceInfo.os)) {
        baseScore += 15;
        riskFactors.push(`New operating system: ${deviceInfo.os}`);
      }
    }
    
    // Add time-based factors
    const currentHour = new Date().getHours();
    if (currentHour >= 0 && currentHour <= 5) {
      baseScore += 10;
      riskFactors.push('Login during unusual hours (midnight-5am)');
    }

    return {
      score: Math.min(100, baseScore), // Cap at 100
      factors: riskFactors
    };
  };

  // Function to send notification about new device login
  const sendDeviceNotification = async (
    userId: string,
    email: string,
    deviceInfo: ReturnType<typeof fingerprintUtils.getDeviceInfo>, 
    isHighRisk: boolean,
    riskFactors: string[]
  ): Promise<void> => {
    try {
      // Get user's IP address
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      const ipAddress = data.ip;
      
      // Create notification message
      const notificationTitle = isHighRisk 
        ? `⚠️ High-Risk Device Login for SecureVault`
        : `New Device Login for SecureVault`;
      
      const notificationDetails = `
        Device: ${deviceInfo.name}
        Browser: ${deviceInfo.browser}
        Operating System: ${deviceInfo.os}
        IP Address: ${ipAddress}
        Time: ${new Date().toLocaleString()}
        Screen Resolution: ${deviceInfo.screenResolution}
        Language: ${deviceInfo.language}
        ${isHighRisk ? `\nRisk Factors:\n- ${riskFactors.join('\n- ')}` : ''}
      `;
      
      // In a real implementation, this would send an email
      console.log(`Would send email to ${email} with title: ${notificationTitle}`);
      console.log(`Notification details: ${notificationDetails}`);
      
      // For demo purposes, we'll just log this event
      await logAuditEvent(userId, 'new_device_notification', 
        `Notification sent for ${isHighRisk ? 'high-risk' : 'new'} device login: ${deviceInfo.name}`);
      
    } catch (error) {
      console.error('Error sending device notification:', error);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      if (!email) {
        throw new Error("Email is required");
      }
      
      // Send reset password email
      await sendPasswordResetEmail(auth, email);
      
      // Show success message
      toast.success("Password Reset Email Sent", {
        description: "Check your email for instructions to reset your password"
      });
      
      // Log the event (without sensitive info)
      try {
        // Find the user ID from the email
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userId = querySnapshot.docs[0].id;
          await logAuditEvent(
            userId,
            'password_reset_requested',
            'Password reset email was sent'
          );
        }
      } catch (logError) {
        // Don't fail the reset process if logging fails
        debugLog('Error logging password reset request:', logError);
      }
    } catch (error: any) {
      console.error("Reset password failed:", error);
      toast.error("Reset Password Failed", {
        description: error.message || "Failed to send reset password email"
      });
      throw error;
    }
  };

  const updateMasterKey = async (currentMasterkey: string, newMasterkey: string): Promise<boolean> => {
    console.log("📋 Starting simple masterkey update");
    
    try {
      // Basic validation
      if (!currentUser) {
        toast.error("Not authenticated", { description: "You must be logged in to change your master key" });
        return false;
      }
      
      if (!vaultUnlocked) {
        toast.error("Vault locked", { description: "Your vault must be unlocked to change the master key" });
        return false;
      }
      
      // Verify current master key
      console.log("🔐 Verifying current master key");
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      
      if (!userData) {
        toast.error("User data not found");
        return false;
      }
      
      if (!userData.vaultKeyHash) {
        toast.error("No master key has been set up");
        return false;
      }
      
      const isValid = encryption.verifyMasterkey(currentMasterkey, userData.vaultKeyHash);
      console.log("🔑 Current masterkey verification:", isValid);
      
      if (!isValid) {
        toast.error("Incorrect master key", { description: "The current master key you entered is incorrect" });
        return false;
      }
      
      // Hash the new master key
      console.log("🔒 Hashing new master key");
      const newKeyHash = encryption.hashMasterkey(newMasterkey);
      
      // If there's vault data, re-encrypt it
      if (userData.vault) {
        console.log("🔄 Re-encrypting vault data");
        try {
          // Decrypt with current key
          const decryptedData = await cryptoUtils.decryptData(userData.vault, currentMasterkey);
          
          // Re-encrypt with new key
          const encryptedData = await cryptoUtils.encryptData(decryptedData, newMasterkey);
          
          // Update Firestore
          await updateDoc(doc(db, 'users', currentUser.uid), {
            vault: encryptedData,
            vaultKeyHash: newKeyHash,
            updatedAt: new Date().toISOString()
          });
        } catch (error) {
          console.error("Encryption error:", error);
          toast.error("Encryption failed", { description: "Failed to re-encrypt your vault data" });
          return false;
        }
      } else {
        // Just update the key hash
        await updateDoc(doc(db, 'users', currentUser.uid), {
          vaultKeyHash: newKeyHash,
          updatedAt: new Date().toISOString()
        });
      }
      
      // Update in-memory and storage
      setMasterKey(newMasterkey);
      secureStorage.secureSet('masterKey', newMasterkey, autoLockTime);
      
      // Log the event
      await logAuditEvent(currentUser.uid, 'masterkey_changed', 'Master key was changed successfully');
      
      toast.success("Master key updated", { description: "Your master key has been updated successfully" });
      return true;
    } catch (error: any) {
      console.error("Master key update error:", error);
      toast.error("Update failed", { description: error.message || "Failed to update master key" });
      return false;
    }
  };

  const value: AuthContextType = {
    user: currentUser,
    loading,
    signUp,
    login,
    signOut,
    resetPassword,
    updateEmail: updateUserEmail,
    updatePassword: updateUserPassword,
    unlockVault,
    lockVault,
    vaultUnlocked,
    masterKey,
    error,
    setError,
    setupTwoFactor,
    verifyTwoFactor,
    disableTwoFactor,
    twoFactorEnabled: isTwoFactorEnabled,
    isAuthenticated,
    updateUserMasterkey,
    updateMasterKey,
    autoLockTime: autoLockTime,
    updateAutoLockTime: updateAutoLockTime,
    isTrustedDevicesEnabled,
    isCurrentDeviceTrusted,
    trustCurrentDevice,
    requireTrustedDevice,
    deleteAccount,
    saveVaultData,
    loadVaultData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
