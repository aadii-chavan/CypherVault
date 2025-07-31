import { authenticator } from 'otplib';
import * as cryptoUtils from './cryptoUtils';

// Configure the authenticator for better security
authenticator.options = {
  window: 1,        // Allow 1 window of 30 seconds past and future (standard)
  digits: 6,        // 6 digit code (standard)
  step: 30          // 30 second time step (standard)
};

/**
 * Generates a new TOTP secret
 */
export function generateTOTPSecret(): string {
  return authenticator.generateSecret(); // This generates a Base32 secret key
}

/**
 * Generates a TOTP URI for QR code generation
 * 
 * @param secret The TOTP secret
 * @param accountName User's account name (typically email)
 * @param issuer The service name, usually "CypherVault"
 */
export function generateTOTPUri(secret: string, accountName: string, issuer: string = 'CypherVault'): string {
  return authenticator.keyuri(encodeURIComponent(accountName), encodeURIComponent(issuer), secret);
}

/**
 * Verifies a TOTP token against a secret
 * 
 * @param token The user-provided TOTP token
 * @param secret The TOTP secret
 * @returns boolean indicating whether the token is valid
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (e) {
    console.error('TOTP verification error:', e);
    return false;
  }
}

/**
 * Encrypts a TOTP secret with the user's master key
 * 
 * @param secret The TOTP secret to encrypt
 * @param masterKey User's master key
 */
export async function encryptTOTPSecret(secret: string, masterKey: string): Promise<string> {
  return cryptoUtils.encryptData(secret, masterKey);
}

/**
 * Decrypts a TOTP secret with the user's master key
 * 
 * @param encryptedSecret The encrypted TOTP secret
 * @param masterKey User's master key
 */
export async function decryptTOTPSecret(encryptedSecret: string, masterKey: string): Promise<string> {
  return cryptoUtils.decryptData(encryptedSecret, masterKey);
}

/**
 * Generates a token for the current time window
 * Helpful for showing the user what the current code should be
 * 
 * @param secret The TOTP secret
 */
export function generateCurrentToken(secret: string): string {
  return authenticator.generate(secret);
} 