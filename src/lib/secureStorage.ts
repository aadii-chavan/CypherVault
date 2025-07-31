/**
 * Secure Storage Utilities
 * 
 * This module provides secure alternatives to localStorage for storing sensitive data.
 * It uses a combination of in-memory storage with timeout-based clearing
 * and session-based storage with encryption.
 */

import * as cryptoUtils from './cryptoUtils';

// In-memory storage that doesn't persist across page refreshes
const inMemoryStorage = new Map<string, { 
  value: any, 
  expiry: number | null,
  timeoutId?: NodeJS.Timeout 
}>();

// Memory storage is cleared when the user navigates away or refreshes
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    clearAllSecureData();
  });
}

/**
 * Stores data securely in memory with optional expiration
 * 
 * @param key Storage key
 * @param value Data to store
 * @param expiryMs Time in milliseconds until data should be cleared (null for no expiry)
 */
export function secureSet(key: string, value: any, expiryMs: number | null = null): void {
  // Clear any existing timeout for this key
  const existingItem = inMemoryStorage.get(key);
  if (existingItem?.timeoutId) {
    clearTimeout(existingItem.timeoutId);
  }
  
  // Calculate expiry timestamp if provided
  const expiry = expiryMs ? Date.now() + expiryMs : null;
  
  // Create new item with timeout
  const newItem = { value, expiry };
  
  // Set up expiry timer if needed
  if (expiry) {
    newItem.timeoutId = setTimeout(() => {
      secureRemove(key);
    }, expiryMs);
  }
  
  // Store in memory
  inMemoryStorage.set(key, newItem);
}

/**
 * Retrieves data from secure storage
 * 
 * @param key Storage key
 * @returns The stored value or null if not found or expired
 */
export function secureGet(key: string): any {
  const item = inMemoryStorage.get(key);
  
  if (!item) return null;
  
  // Check if item has expired
  if (item.expiry && Date.now() > item.expiry) {
    secureRemove(key);
    return null;
  }
  
  return item.value;
}

/**
 * Securely removes data from storage
 * 
 * @param key Storage key
 */
export function secureRemove(key: string): void {
  const item = inMemoryStorage.get(key);
  
  if (item) {
    // Clear the timeout if it exists
    if (item.timeoutId) {
      clearTimeout(item.timeoutId);
    }
    
    // Sanitize the data before removing
    try {
      cryptoUtils.sanitizeMemory(item.value);
    } catch (e) {
      // Ignore errors in sanitization
      console.error('Error sanitizing memory:', e);
    }
    inMemoryStorage.delete(key);
  }
}

/**
 * Clears all secure data
 */
export function clearAllSecureData(): void {
  // Clear all timeouts and sanitize values
  inMemoryStorage.forEach((item, key) => {
    if (item.timeoutId) {
      clearTimeout(item.timeoutId);
    }
    try {
      cryptoUtils.sanitizeMemory(item.value);
    } catch (e) {
      // Ignore errors in sanitization
    }
  });
  
  // Clear the storage
  inMemoryStorage.clear();
}

/**
 * Stores data in sessionStorage with encryption
 * For data that needs to persist during the session
 * but is less sensitive than what's stored in memory
 * 
 * @param key Storage key
 * @param value Data to store
 * @param encryptionKey Key to encrypt the data with
 */
export const secureSessionSet = async (key: string, value: string, expiryInMs: number): Promise<void> => {
  try {
    const encryptedValue = await cryptoUtils.encryptData(value, key);
    const sessionData = {
      value: encryptedValue,
      expiry: Date.now() + expiryInMs
    };
    sessionStorage.setItem(key, JSON.stringify(sessionData));
  } catch (error) {
    console.error("Error setting secure session data:", error);
    throw error;
  }
};

/**
 * Retrieves and decrypts data from sessionStorage
 * 
 * @param key Storage key
 * @param encryptionKey Key to decrypt the data with
 * @returns The decrypted data or null if not found
 */
export const secureSessionGet = async (key: string): Promise<string | null> => {
  try {
    const sessionDataStr = sessionStorage.getItem(key);
    if (!sessionDataStr) return null;

    const sessionData = JSON.parse(sessionDataStr);
    if (Date.now() > sessionData.expiry) {
      sessionStorage.removeItem(key);
      return null;
    }

    return await cryptoUtils.decryptData(sessionData.value, key);
  } catch (error) {
    console.error("Error retrieving secure session data:", error);
    return null;
  }
};

/**
 * Removes secure data from sessionStorage with secure overwriting
 * 
 * @param key Storage key
 */
export function secureSessionRemove(key: string): void {
  try {
    const item = sessionStorage.getItem(key);
    if (item) {
      // Overwrite with random data before removing
      const randomData = Array(item.length).fill(0)
        .map(() => String.fromCharCode(Math.floor(Math.random() * 94) + 33))
        .join('');
      
      // Overwrite the data first
      sessionStorage.setItem(key, randomData);
      
      // Then remove it
      sessionStorage.removeItem(key);
    }
  } catch (e) {
    // Just remove normally if overwriting fails
    sessionStorage.removeItem(key);
  }
}

/**
 * Clears all secure session data
 */
export function clearAllSecureSessionData(): void {
  // Only remove items with 'secure_' prefix
  const secureKeys: string[] = [];
  
  // First collect all secure keys
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith('secure_')) {
      secureKeys.push(key);
    }
  }
  
  // Then securely remove each item
  secureKeys.forEach(key => {
    try {
      const item = sessionStorage.getItem(key);
      if (item) {
        // Overwrite with random data before removing
        const randomData = Array(item.length).fill(0)
          .map(() => String.fromCharCode(Math.floor(Math.random() * 94) + 33))
          .join('');
        
        // Overwrite the data first
        sessionStorage.setItem(key, randomData);
      }
    } catch (e) {
      // Ignore errors in overwriting
    }
    
    // Remove the item
    sessionStorage.removeItem(key);
  });
} 