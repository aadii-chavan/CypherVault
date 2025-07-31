/**
 * Stealth Mode and Panic Key Utilities
 * 
 * This module provides utilities for quickly hiding sensitive information
 * and implementing stealth/panic mode features for emergency situations.
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logAuditEvent } from './auditLogger';
import * as secureStorage from './secureStorage';
import * as cryptoUtils from './cryptoUtils';

// Stealth mode settings type
export interface StealthModeSettings {
  enabled: boolean;
  appTitle: string;
  appIcon: string;
  hideNotifications: boolean;
  panicKeyEnabled: boolean;
  panicKey: string;
  panicRedirectUrl: string;
  redirectUrl: string;
}

// Default settings
export const DEFAULT_SETTINGS: StealthModeSettings = {
  enabled: false,
  appTitle: 'Documents',
  appIcon: '/icons/stealth/document.svg',
  hideNotifications: true,
  panicKeyEnabled: false,
  panicKey: 'Escape',
  panicRedirectUrl: 'https://www.google.com',
  redirectUrl: 'https://www.google.com'
};

// Default app title when stealth mode is disabled
const DEFAULT_APP_TITLE = 'CypherVault';
const DEFAULT_ICON = '/cyphervault.png';

// Session key for encryption (generated on load)
const SESSION_KEY = crypto.getRandomValues(new Uint8Array(16)).toString();

/**
 * Get stealth mode settings from secure storage
 */
export async function getSettings(): Promise<StealthModeSettings> {
  try {
    // Get the current user ID from secure storage
    const userData = secureStorage.secureGet('userPanicData');
    if (userData?.uid) {
      try {
        // Try to get from Firestore first if we have a user ID
        const userDoc = doc(db, 'users', userData.uid);
        const docSnap = await getDoc(userDoc);
        
        if (docSnap.exists() && docSnap.data().stealthModeSettings) {
          const firestoreSettings = docSnap.data().stealthModeSettings as StealthModeSettings;
          // Validate settings before using them
          if (isValidSettings(firestoreSettings)) {
            // Update local storage with Firestore settings
            secureStorage.secureSet('stealthModeSettings', firestoreSettings);
            return firestoreSettings;
          }
        }
      } catch (firestoreError) {
        console.warn('Error fetching from Firestore, falling back to local storage:', firestoreError);
      }
    }
    
    // If no Firestore data or no user, try secure storage
    const settings = secureStorage.secureGet('stealthModeSettings');
    if (settings && isValidSettings(settings)) {
      return settings;
    }
    
    // If not in memory, try from sessionStorage
    try {
      const sessionSettings = await secureStorage.secureSessionGet('stealthModeSettings', SESSION_KEY);
      if (sessionSettings && isValidSettings(sessionSettings)) {
        // Move to memory for faster access
        secureStorage.secureSet('stealthModeSettings', sessionSettings);
        return sessionSettings;
      }
    } catch (sessionError) {
      console.warn('Error fetching from session storage:', sessionError);
    }
    
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error getting stealth mode settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Validate stealth mode settings
 */
export function isValidSettings(settings: any): settings is StealthModeSettings {
  return (
    settings &&
    typeof settings === 'object' &&
    typeof settings.enabled === 'boolean' &&
    typeof settings.appTitle === 'string' &&
    typeof settings.appIcon === 'string' &&
    typeof settings.hideNotifications === 'boolean' &&
    typeof settings.panicKeyEnabled === 'boolean' &&
    typeof settings.panicKey === 'string' &&
    typeof settings.panicRedirectUrl === 'string' &&
    typeof settings.redirectUrl === 'string'
  );
}

/**
 * Store stealth mode settings securely
 */
export async function saveSettings(userId: string, settings: StealthModeSettings): Promise<void> {
  try {
    // Save to Firestore first for persistence across sessions
    const userDoc = doc(db, 'users', userId);
    await updateDoc(userDoc, {
      stealthModeSettings: settings
    });
    
    // Save to secure memory
    secureStorage.secureSet('stealthModeSettings', settings);
    
    // Save to sessionStorage as backup
    await secureStorage.secureSessionSet('stealthModeSettings', settings, SESSION_KEY);
    
    // Update user data for panic mode
    updateUserDataForPanic(userId);
    
    // Log this security setting change
    await logAuditEvent(
      userId,
      'security_setting_changed',
      'Updated stealth mode settings'
    );
  } catch (error) {
    console.error('Error saving stealth mode settings:', error);
    throw error;
  }
}

/**
 * Changes the favicon of the site
 */
function changeFavicon(iconPath: string): void {
  try {
    console.log("Changing favicon to:", iconPath);
    
    // Remove any existing favicon links
    const existingLinks = document.querySelectorAll("link[rel*='icon']");
    existingLinks.forEach(link => link.remove());
    
    // Create new favicon link
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = iconPath;
    
    // Add to document head
    document.head.appendChild(link);
  } catch (error) {
    console.error('Error changing favicon:', error);
  }
}

/**
 * Initialize stealth mode
 * Checks for stealth mode settings and restores them on page load
 */
export const initStealthMode = async (userId?: string): Promise<void> => {
  console.log("Initializing stealth mode on application start");
  try {
    // If userId is provided, update user data first
    if (userId) {
      updateUserDataForPanic(userId);
    }
    
    // Check for stealth mode settings
    const settings = await getSettings();
    console.log("Loaded settings:", settings);
    
    // If stealth mode is enabled, activate it
    if (settings.enabled) {
      console.log("Stealth mode is enabled, activating...");
      activateStealthMode(settings);
    } else {
      console.log("Stealth mode is disabled, setting default title and icon...");
      // Set default title when stealth mode is disabled
      document.title = DEFAULT_APP_TITLE;
      changeFavicon(DEFAULT_ICON);
    }
    
    // Register panic key listener if enabled, regardless of stealth mode status
    if (settings.panicKeyEnabled && settings.panicKey) {
      registerPanicKeyListener(settings.panicKey);
    }
  } catch (error) {
    console.error("Error initializing stealth mode:", error);
  }
};

/**
 * Activates stealth mode to hide sensitive information
 * 
 * @param settings Stealth mode settings to apply
 */
export function activateStealthMode(settings: StealthModeSettings): void {
  console.log('Activating stealth mode with settings:', settings);
  
  // Change the document title
  document.title = settings.appTitle;
  
  // Change favicon
  changeFavicon(settings.appIcon);
  
  // Set body class for CSS hooks
  document.body.classList.add('stealth-mode-active');
  
  // Store active state securely
  secureStorage.secureSet('stealthModeActive', true);
  secureStorage.secureSet('stealthModeSettings', settings);
  
  // If redirect URL is set, update it
  if (settings.redirectUrl) {
    secureStorage.secureSet('stealthModeRedirectUrl', settings.redirectUrl);
  }
}

/**
 * Deactivates stealth mode and returns to normal app appearance
 */
export function deactivateStealthMode(): void {
  console.log("Deactivating stealth mode...");
  
  // Restore the document title
  document.title = DEFAULT_APP_TITLE;
  
  // Restore the favicon
  changeFavicon(DEFAULT_ICON);
  
  // Remove the CSS class
  document.body.classList.remove('stealth-mode-active');
  
  // Update secure storage
  secureStorage.secureSet('stealthModeActive', false);
  
  // Get current settings and update
  getSettings().then(settings => {
    settings.enabled = false;
    secureStorage.secureSet('stealthModeSettings', settings);
  });
}

/**
 * Registers a key listener for the panic key
 */
export async function registerPanicKeyListener(panicKey: string): Promise<void> {
  try {
    if (!panicKey || typeof panicKey !== 'string') {
      console.warn('Invalid panic key provided:', panicKey);
      return;
    }

    console.log("Registering panic key listener for key:", panicKey);
    
    // Remove any existing listener first
    unregisterPanicKeyListener();
    
    // Store the panic key in memory for the handler
    secureStorage.secureSet('panicKey', panicKey);
    
    // Get current settings to verify panic key is enabled
    const settings = await getSettings();
    if (!settings?.panicKeyEnabled) {
      console.log("Panic key is disabled in settings, not registering listener");
      return;
    }
    
    // Add the new listener
    window.addEventListener('keydown', handlePanicKey);
    console.log("Panic key listener registered successfully");
  } catch (error) {
    console.error('Error registering panic key listener:', error);
    throw error;
  }
}

/**
 * Handler for panic key press
 */
export async function handlePanicKey(event: KeyboardEvent): Promise<void> {
  if (!event || typeof event.key !== 'string') {
    console.warn('Invalid key event received:', event);
    return;
  }

  try {
    const settings = await getSettings();
    if (!settings?.panicKeyEnabled) {
      return;
    }

    const storedPanicKey = settings.panicKey;
    if (!storedPanicKey) {
      console.warn('No panic key set');
      return;
    }

    // Normalize both keys to lowercase for comparison
    const pressedKey = event.key.toLowerCase();
    const normalizedStoredKey = storedPanicKey.toLowerCase();

    // Log the key comparison for debugging
    console.log('Panic key comparison:', { pressedKey, storedKey: normalizedStoredKey });

    if (pressedKey === normalizedStoredKey) {
      console.log('Panic key match detected, triggering panic mode');
      await triggerPanic();
    }
  } catch (error) {
    console.error('Error handling panic key:', error);
  }
}

/**
 * Trigger panic mode
 * This will lock the vault, clear sensitive data, and redirect to a safe URL
 */
export const triggerPanic = async (): Promise<void> => {
  console.log("Triggering panic mode...");
  
  try {
    // Get settings and redirect URL
    const settings = await getSettings();
    const redirectUrl = settings.redirectUrl || 'https://www.google.com';
    
    // Clear sensitive data from memory immediately
    secureStorage.clearAllSecureData();
    secureStorage.clearAllSecureSessionData();
    
    // Clear clipboard if possible
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText('');
      }
    } catch (clipboardError) {
      console.warn('Error clearing clipboard:', clipboardError);
    }
    
    // Dispatch events for UI cleanup
    window.dispatchEvent(new CustomEvent('clear-vault-key'));
    window.dispatchEvent(new CustomEvent('lock-vault'));
    
    // Log the panic event
    const userData = secureStorage.secureGet('userPanicData');
    if (userData?.uid) {
      try {
        await logAuditEvent(
          userData.uid,
          'panic_triggered',
          'Panic mode was triggered'
        );
      } catch (logError) {
        console.warn('Error logging panic event:', logError);
      }
    }
    
    // Redirect immediately without any delay
    window.location.replace(redirectUrl);
  } catch (error) {
    console.error('Error triggering panic mode:', error);
    // Still try to redirect even if there's an error
    window.location.replace('https://www.google.com');
  }
};

/**
 * Update the user data for panic mode
 * @param userId The user ID to store
 */
export function updateUserDataForPanic(userId: string): void {
  if (!userId) return;
  
  try {
    // Simplified user object with just the essential fields for panic mode
    const simpleUser = { 
      uid: userId,
      lastUpdated: new Date().toISOString()
    };
    
    // Store in secure storage rather than localStorage
    secureStorage.secureSet('userPanicData', simpleUser);
  } catch (error) {
    console.error('Error storing user data for panic mode:', error);
  }
}

// Add a new function to initialize stealth mode with proper user context
export const initializeStealthModeWithUser = async (userId: string): Promise<void> => {
  try {
    // Update user data for panic mode
    updateUserDataForPanic(userId);
    
    // Check for stealth mode settings
    const settings = await getSettings();
    console.log("Loaded settings:", settings);
    
    // If stealth mode is enabled, activate it
    if (settings.enabled) {
      console.log("Stealth mode is enabled, activating...");
      activateStealthMode(settings);
    } else {
      console.log("Stealth mode is disabled, setting default title and icon...");
      // Set default title when stealth mode is disabled
      document.title = DEFAULT_APP_TITLE;
      changeFavicon(DEFAULT_ICON);
    }
    
    // Register panic key listener if enabled, regardless of stealth mode status
    if (settings.panicKeyEnabled && settings.panicKey) {
      registerPanicKeyListener(settings.panicKey);
    }
  } catch (error) {
    console.error("Error initializing stealth mode:", error);
  }
};

// Get stealth mode settings
export const getStealthModeSettings = async (userId: string): Promise<StealthModeSettings> => {
  try {
    // Try to get from Firestore first
    const userDoc = doc(db, 'users', userId);
    const docSnap = await getDoc(userDoc);
    
    if (docSnap.exists() && docSnap.data().stealthModeSettings) {
      return docSnap.data().stealthModeSettings as StealthModeSettings;
    }
    
    // If not in Firestore, try secure storage
    const settings = secureStorage.secureGet('stealthModeSettings');
    if (settings) {
      return settings;
    }
    
    // If not in memory, try from sessionStorage
    const sessionSettings = await secureStorage.secureSessionGet('stealthModeSettings', SESSION_KEY);
    if (sessionSettings) {
      // Move to memory for faster access
      secureStorage.secureSet('stealthModeSettings', sessionSettings);
      return sessionSettings;
    }
    
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error getting stealth mode settings:', error);
    return DEFAULT_SETTINGS;
  }
};

// Update stealth mode settings
export const updateStealthModeSettings = async (userId: string, partialSettings: Partial<StealthModeSettings>): Promise<void> => {
  try {
    // Get current settings first
    const currentSettings = await getStealthModeSettings(userId);
    
    // Merge partial settings with current settings
    const newSettings: StealthModeSettings = {
      ...currentSettings,
      ...partialSettings
    };
    
    // Save the merged settings
    await saveSettings(userId, newSettings);
  } catch (error) {
    console.error('Error updating stealth mode settings:', error);
    throw error;
  }
};

// Unregister panic key listener
export const unregisterPanicKeyListener = (): void => {
  console.log("Unregistering panic key listener");
  window.removeEventListener('keydown', handlePanicKey);
  secureStorage.secureSet('panicKey', null);
}; 