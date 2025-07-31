const HIBP_API_URL = '/api/hibp/range/';

export interface BreachResult {
  isBreached: boolean;
  count: number;
  error?: string;
}

/**
 * Generate SHA-1 hash of a string using Web Crypto API
 */
async function sha1(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await window.crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.toUpperCase();
}

/**
 * Check if a password has been compromised in known data breaches
 * using the k-anonymity model to protect user passwords
 */
export async function checkPassword(password: string): Promise<BreachResult> {
  try {
    // Generate SHA-1 hash of the password
    const hash = await sha1(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    // Fetch from HIBP API through our proxy
    const response = await fetch(`${HIBP_API_URL}${prefix}`);

    if (!response.ok) {
      throw new Error(`HIBP API request failed: ${response.status}`);
    }

    const text = await response.text();
    const lines = text.split('\n');

    // Find matching suffix
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix === suffix) {
        return {
          isBreached: true,
          count: parseInt(count, 10)
        };
      }
    }

    // No match found
    return {
      isBreached: false,
      count: 0
    };
  } catch (error) {
    console.error('Error checking password:', error);
    return {
      isBreached: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get risk level based on breach count
 */
export function getRiskLevel(count: number): 'safe' | 'low' | 'medium' | 'high' | 'critical' {
  if (count === 0) return 'safe';
  if (count <= 10) return 'low';
  if (count <= 100) return 'medium';
  if (count <= 1000) return 'high';
  return 'critical';
}

/**
 * Get recommendations based on risk level
 */
export function getRecommendations(riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'): string[] {
  const recommendations: Record<string, string[]> = {
    safe: [
      'Your password appears to be secure',
      'Consider using a password manager to maintain strong passwords'
    ],
    low: [
      'Your password has been seen in a small number of breaches',
      'Consider changing it to a more unique password',
      'Use a combination of letters, numbers, and special characters'
    ],
    medium: [
      'Your password has been seen in multiple breaches',
      'Change your password immediately',
      'Use a password manager to generate and store strong passwords',
      'Enable two-factor authentication where available'
    ],
    high: [
      'Your password has been seen in many breaches',
      'Change your password immediately',
      'Do not reuse this password anywhere else',
      'Use a password manager to generate and store strong passwords',
      'Enable two-factor authentication on all accounts'
    ],
    critical: [
      'Your password has been seen in numerous breaches',
      'Change your password immediately',
      'This password is extremely compromised and should never be used',
      'Use a password manager to generate and store strong passwords',
      'Enable two-factor authentication on all accounts',
      'Consider changing passwords for any accounts that might have used this password'
    ]
  };

  return recommendations[riskLevel];
} 