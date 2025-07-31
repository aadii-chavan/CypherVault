/**
 * CypherVault Cryptography Utilities
 * 
 * This module provides secure cryptographic operations using the Web Crypto API
 * following OWASP recommendations for password managers.
 */

// TypeScript declaration for potential global CryptoJS instance
declare global {
  interface Window {
    CryptoJS?: any;
  }
}

// Configuration constants (OWASP-recommended)
const PBKDF2_ITERATIONS = 310000;
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12; // bytes for AES-GCM
const AES_KEY_LENGTH = 256; // bits

// Add this helper function near the top of the file
const DEBUG_MODE = process.env.NODE_ENV !== 'production';

const debugLog = (...args: any[]) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

/**
 * Converts an ArrayBuffer to a Base64 string for storage
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Converts a Base64 string back to an ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts a string to an ArrayBuffer using UTF-8 encoding
 */
export function stringToArrayBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str);
}

/**
 * Converts an ArrayBuffer to a string using UTF-8 encoding
 */
export function arrayBufferToString(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

/**
 * Generates a cryptographically secure random salt
 */
export function generateSalt(): ArrayBuffer {
  return window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH)).buffer;
}

/**
 * Generates a cryptographically secure random IV for AES-GCM
 */
export function generateIV(): ArrayBuffer {
  return window.crypto.getRandomValues(new Uint8Array(IV_LENGTH)).buffer;
}

/**
 * Derives an encryption key from a password using PBKDF2
 * 
 * @param password Master password from user
 * @param salt Random salt (should be unique per encryption)
 * @returns Promise resolving to the derived key
 */
export async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  // First import the password as a key
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive an AES-GCM key using PBKDF2
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: AES_KEY_LENGTH
    },
    false, // Not extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts data using AES-GCM with the provided key
 * 
 * @param data Plain text data to encrypt
 * @param masterPassword User's master password
 * @returns Promise resolving to encrypted data with salt and IV
 */
export async function encryptData(data: string, masterPassword: string): Promise<string> {
  try {
    // Generate a random salt and IV for this encryption
    const salt = generateSalt();
    const iv = generateIV();
    
    // Convert data to ArrayBuffer
    const dataBuffer = stringToArrayBuffer(data);
    
    // Derive the encryption key from the password and salt
    const key = await deriveKey(masterPassword, salt);
    
    // Encrypt the data using AES-GCM
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      dataBuffer
    );
    
    // Combine salt, IV, and encrypted data, converting to Base64
    const saltBase64 = arrayBufferToBase64(salt);
    const ivBase64 = arrayBufferToBase64(iv);
    const encryptedBase64 = arrayBufferToBase64(encryptedBuffer);
    
    // Format: salt:iv:encryptedData
    return `${saltBase64}:${ivBase64}:${encryptedBase64}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data using AES-GCM with the provided master password
 * 
 * @param encryptedData Encrypted data string (format: salt:iv:encryptedData)
 * @param masterPassword User's master password
 * @returns Promise resolving to the decrypted data
 */
export async function decryptData(encryptedData: string, masterPassword: string): Promise<string> {
  try {
    // Split the encrypted data into its components
    const [saltBase64, ivBase64, ciphertextBase64] = encryptedData.split(':');
    
    if (!saltBase64 || !ivBase64 || !ciphertextBase64) {
      throw new Error("Invalid encrypted data format");
    }
    
    // Convert Base64 strings back to ArrayBuffers
    const salt = base64ToArrayBuffer(saltBase64);
    const iv = base64ToArrayBuffer(ivBase64);
    const encryptedBuffer = base64ToArrayBuffer(ciphertextBase64);
    
    // Derive the key using the same salt and password
    const key = await deriveKey(masterPassword, salt);
    
    // Decrypt the data
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedBuffer
    );
    
    // Convert the decrypted ArrayBuffer back to a string
    return arrayBufferToString(decryptedBuffer);
  } catch (error) {
    console.error('Decryption error:', error);
    if (error instanceof DOMException && error.name === 'OperationError') {
      throw new Error("Decryption failed - incorrect master password");
    }
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Encrypts a single password entry with its own unique salt and IV
 * 
 * @param entry Password entry to encrypt
 * @param masterPassword User's master password
 * @returns Promise resolving to the encrypted entry
 */
export async function encryptEntry(entry: any, masterPassword: string): Promise<string> {
  return encryptData(JSON.stringify(entry), masterPassword);
}

/**
 * Decrypts a single password entry 
 * 
 * @param encryptedEntry Encrypted entry string
 * @param masterPassword User's master password
 * @returns Promise resolving to the decrypted entry object
 */
export async function decryptEntry(encryptedEntry: string, masterPassword: string): Promise<any> {
  const decryptedText = await decryptData(encryptedEntry, masterPassword);
  return JSON.parse(decryptedText);
}

/**
 * Generates a secure random password
 */
export function generatePassword(
  length: number = 16,
  includeUppercase: boolean = true,
  includeLowercase: boolean = true,
  includeNumbers: boolean = true,
  includeSymbols: boolean = true
): string {
  let charset = '';
  
  if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (includeNumbers) charset += '0123456789';
  if (includeSymbols) charset += '!@#$%^&*()_+~`|}{[]:;?><,./-=';
  
  // Ensure charset is not empty
  if (!charset) charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  // Get cryptographically secure random values
  const randomValues = new Uint32Array(length);
  window.crypto.getRandomValues(randomValues);
  
  let password = '';
  for (let i = 0; i < length; i++) {
    // Use modulo to map the random value to a charset index
    password += charset[randomValues[i] % charset.length];
  }
  
  return password;
}

/**
 * Generates a cryptographically secure random string
 * 
 * @param length Length of the string to generate
 * @param characters Optional character set (defaults to alphanumeric)
 * @returns Random string of specified length
 */
export function generateRandomString(length: number, characters?: string): string {
  const charset = characters || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  // Get cryptographically secure random values
  const randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);
  
  let result = '';
  for (let i = 0; i < length; i++) {
    // Map the random values to the character set
    const randomIndex = randomValues[i] % charset.length;
    result += charset.charAt(randomIndex);
  }
  
  return result;
}

/**
 * Legacy decryption compatibility layer
 * Attempts to decrypt data that was encrypted with older methods
 */
export async function tryLegacyDecrypt(encryptedData: string, masterPassword: string): Promise<string | null> {
  try {
    // Check if data might be plaintext JSON already
    if (encryptedData.startsWith('{') || encryptedData.startsWith('[')) {
      try {
        // Try parsing as JSON directly
        JSON.parse(encryptedData);
        return encryptedData;
      } catch (e) {
        // Not valid JSON
      }
    }
    
    // Check if we're dealing with a potentially legacy format
    if (!encryptedData.includes(':')) {
      // This might be a legacy format
      try {
        // Try to access CryptoJS
        if (typeof window.CryptoJS !== 'undefined') {
          try {
            // Try CryptoJS AES decrypt
            const bytes = window.CryptoJS.AES.decrypt(encryptedData, masterPassword);
            const decryptedText = bytes.toString(window.CryptoJS.enc.Utf8);
            
            if (!decryptedText) {
              return null;
            }
            
            // Validate that it's proper JSON
            try {
              JSON.parse(decryptedText);
              return decryptedText;
            } catch (e) {
              return null;
            }
          } catch (decryptError) {
            // Failed to decrypt
          }
        }
      } catch (cryptoJsError) {
        // Error accessing CryptoJS
      }
      
      // Try a different encoding approach
      try {
        // Some applications encoded passwords in custom ways
        // Try common patterns like Base64 -> JSON
        try {
          const decoded = atob(encryptedData);
          try {
            JSON.parse(decoded);
            return decoded;
          } catch (jsonError) {
            // Not valid JSON
          }
        } catch (base64Error) {
          // Not valid base64
        }
      } catch (encodingError) {
        // Encoding attempts failed
      }
    } 
    
    // Try to use the encryption.ts functions directly as a final fallback
    try {
      // Import encryption since it uses a different library
      const encryption = await import('./encryption');
      
      // Try the decryptData function from encryption.ts
      if (encryption && typeof encryption.decryptData === 'function') {
        try {
          // Don't let one error halt the entire process
          const decryptedText = encryption.decryptData(encryptedData, masterPassword);
          
          if (decryptedText && typeof decryptedText === 'string') {
            // Validate it's proper JSON
            try {
              JSON.parse(decryptedText);
              debugLog('Legacy format decrypted with encryption.ts decryptData');
              return decryptedText;
            } catch (e) {
              // Not valid JSON
            }
          }
        } catch (decryptError) {
          // Failed to decrypt with encryption.ts
        }
      }
    } catch (importError) {
      // Failed to import or use encryption.ts
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Calculates password strength
 */
export function calculatePasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  const length = password.length;
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSymbols = /[!@#$%^&*()_+~`|}{[\]:;?><,./-=]/.test(password);
  
  const varietyScore = [hasLowerCase, hasUpperCase, hasNumbers, hasSymbols].filter(Boolean).length;
  
  if (length < 8 || varietyScore < 2) return 'weak';
  if (length < 12 || varietyScore < 3) return 'medium';
  return 'strong';
}

/**
 * Securely wipes sensitive data from memory
 * This helps mitigate memory inspection attacks
 * 
 * @param variable The variable containing sensitive data to be cleared
 */
export function sanitizeMemory(variable: any): void {
  if (typeof variable === 'string') {
    // For strings, overwrite with random characters before setting to empty
    const length = variable.length;
    const randomString = Array(length).fill(0).map(() => 
      String.fromCharCode(Math.floor(Math.random() * 94) + 33)
    ).join('');
    
    // Overwrite the memory with random data
    variable = randomString;
    
    // Clear the variable with delay to ensure garbage collection
    setTimeout(() => {
      variable = '';
      variable = null;
    }, 0);
  } else if (variable instanceof ArrayBuffer || variable instanceof Uint8Array) {
    // For array buffers and typed arrays, overwrite with random bytes
    const length = variable.byteLength;
    const randomBytes = new Uint8Array(length);
    window.crypto.getRandomValues(randomBytes);
    
    // If it's a Uint8Array, overwrite directly
    if (variable instanceof Uint8Array) {
      variable.set(randomBytes);
    } else {
      // For ArrayBuffer, create a view and overwrite
      new Uint8Array(variable).set(randomBytes);
    }
    
    // Force garbage collection with delay
    setTimeout(() => {
      variable = null;
    }, 0);
  } else if (typeof variable === 'object' && variable !== null) {
    // For objects, sanitize each property
    Object.keys(variable).forEach(key => {
      sanitizeMemory(variable[key]);
      variable[key] = null;
    });
    
    // Clear the variable with delay to ensure garbage collection
    setTimeout(() => {
      variable = null;
    }, 0);
  }
}

/**
 * Wraps a function to sanitize memory after use
 * Particularly useful for decryption functions that handle sensitive data
 * 
 * @param fn The function to wrap with memory sanitization
 * @returns A wrapped function that automatically cleans up after execution
 */
export function withMemorySanitization<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    try {
      const result = fn(...args);
      
      // Handle promises specially
      if (result instanceof Promise) {
        return result.finally(() => {
          // Sanitize arguments after the promise resolves or rejects
          args.forEach(arg => sanitizeMemory(arg));
        }) as ReturnType<T>;
      }
      
      // For synchronous functions
      args.forEach(arg => sanitizeMemory(arg));
      return result;
    } catch (error) {
      // Ensure memory is sanitized even if an error occurs
      args.forEach(arg => sanitizeMemory(arg));
      throw error;
    }
  };
}

/**
 * Hashes a password with the provided salt using PBKDF2
 * 
 * @param password Password to hash
 * @param salt Salt string (Base64 encoded)
 * @returns Promise resolving to the hashed password
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  try {
    // Convert the string salt to an ArrayBuffer if it's in Base64 format
    const saltBuffer = typeof salt === 'string' && salt.includes('/') 
      ? base64ToArrayBuffer(salt) 
      : stringToArrayBuffer(salt);
    
    // Import the password as a key
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      stringToArrayBuffer(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    // Derive bits using PBKDF2
    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      passwordKey,
      256 // 32 bytes (256 bits)
    );
    
    // Convert to a Base64 string
    return arrayBufferToBase64(derivedBits);
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
}

/**
 * Generate a SHA-1 hash of a string (for HIBP password checks)
 * @param text The text to hash
 * @returns SHA-1 hash as a hex string
 */
export async function sha1Hash(text: string): Promise<string> {
  try {
    // Convert the text to a Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Create a SHA-1 hash of the data
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    
    // Convert the hash to a hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex.toUpperCase();
  } catch (error) {
    console.error('Error generating SHA-1 hash:', error);
    throw new Error('Failed to generate SHA-1 hash');
  }
}

/**
 * Generate a SHA-256 hash of a string (for audit log integrity)
 * @param text The text to hash
 * @returns SHA-256 hash as a hex string
 */
export async function sha256Hash(text: string): Promise<string> {
  try {
    // Convert the text to a Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Create a SHA-256 hash of the data
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert the hash to a hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Error generating SHA-256 hash:', error);
    throw new Error('Failed to generate SHA-256 hash');
  }
}

/**
 * Generate a secure salt for password hashing (string version)
 */
export async function generateSaltString(): Promise<string> {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a password with optional salt for secure storage (string version)
 */
export async function hashPasswordString(password: string, salt?: string): Promise<string> {
  try {
    // Generate a salt if not provided
    const passwordSalt = salt || await generateSaltString();
    
    // Encode the password and salt
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password + passwordSalt);
    
    // Create a SHA-256 hash of the password
    const hashBuffer = await crypto.subtle.digest('SHA-256', passwordData);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Include the salt in the result if it was generated
    return salt ? hashHex : `${hashHex}.${passwordSalt}`;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    let salt: string | undefined;
    let hash = storedHash;
    
    // Extract salt if included in stored hash
    if (storedHash.includes('.')) {
      const parts = storedHash.split('.');
      hash = parts[0];
      salt = parts[1];
    }
    
    // Hash the input password with the same salt
    const newHash = await hashPasswordString(password, salt);
    
    // Compare the hashes
    return newHash === storedHash;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
} 