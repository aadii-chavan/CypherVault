import * as cryptoUtils from './cryptoUtils';

// Generate a random salt
const generateSalt = () => {
  return cryptoUtils.generateSaltString();
};

// Encrypt data using AES-GCM with the provided key
export const encryptData = async (data: string, key: string): Promise<string> => {
  try {
    return await cryptoUtils.encryptData(data, key);
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Encryption failed - invalid data or key");
  }
};

// Decrypt data using AES-GCM with the provided key
export const decryptData = async (encryptedData: string, key: string): Promise<string> => {
  try {
    return await cryptoUtils.decryptData(encryptedData, key);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Decryption failed - incorrect key");
  }
};

// Hash the masterkey for storage
export const hashMasterkey = async (masterkey: string): Promise<string> => {
  try {
    const salt = await generateSalt();
    const hash = await cryptoUtils.hashPasswordString(masterkey, salt);
    return salt + ':' + hash;
  } catch (error) {
    console.error("Error hashing masterkey:", error);
    throw new Error("Failed to hash masterkey");
  }
};

// Verify a hashed masterkey
export const verifyMasterkey = async (masterkey: string, hashedKey: string): Promise<boolean> => {
  try {
    const [salt, hash] = hashedKey.split(':');
    if (!salt || !hash) {
      console.error("Invalid hashed key format");
      return false;
    }
    
    // Hash the provided masterkey with the stored salt
    const newHash = await cryptoUtils.hashPasswordString(masterkey, salt);
    
    // Compare the hashes
    return newHash === hash;
  } catch (error) {
    console.error("Error verifying masterkey:", error);
    return false;
  }
};

// Generate a random password based on criteria
export const generatePassword = (
  length: number = 16,
  includeUppercase: boolean = true,
  includeLowercase: boolean = true,
  includeNumbers: boolean = true,
  includeSymbols: boolean = true
): string => {
  return cryptoUtils.generatePassword(length, includeUppercase, includeLowercase, includeNumbers, includeSymbols);
};

// Calculate password strength
export const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  return cryptoUtils.calculatePasswordStrength(password);
};
