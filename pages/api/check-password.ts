import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { getSession } from 'next-auth/react';
import rateLimit from '@/lib/rateLimit';

const HIBP_API_URL = 'https://api.pwnedpasswords.com/range/';

// Initialize rate limiter: 10 requests per minute
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

type ResponseData = {
  isBreached: boolean;
  count: number;
  error?: string;
  details?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ 
      isBreached: false, 
      count: 0,
      error: 'Method not allowed' 
    });
    return;
  }

  try {
    // Check authentication
    const session = await getSession({ req });
    if (!session) {
      res.status(401).json({ 
        isBreached: false, 
        count: 0,
        error: 'Unauthorized' 
      });
      return;
    }

    // Apply rate limiting
    try {
      await limiter.check(res, 10, 'CACHE_TOKEN'); // 10 requests per minute
    } catch {
      res.status(429).json({ 
        isBreached: false, 
        count: 0,
        error: 'Too many requests' 
      });
      return;
    }

    const { password } = req.body;

    if (!password) {
      res.status(400).json({ 
        isBreached: false, 
        count: 0,
        error: 'Password is required' 
      });
      return;
    }

    // Generate SHA-1 hash of the password
    const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    // Fetch from HIBP API
    const response = await fetch(`${HIBP_API_URL}${prefix}`, {
      headers: {
        'User-Agent': 'CypherVault-Password-Checker'
      }
    });

    if (!response.ok) {
      throw new Error(`HIBP API request failed: ${response.status}`);
    }

    const text = await response.text();
    const lines = text.split('\n');

    // Find matching suffix
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix === suffix) {
        res.status(200).json({
          isBreached: true,
          count: parseInt(count, 10)
        });
        return;
      }
    }

    // No match found
    res.status(200).json({
      isBreached: false,
      count: 0
    });

  } catch (error) {
    console.error('Error checking password:', error);
    res.status(500).json({ 
      isBreached: false,
      count: 0,
      error: 'Failed to check password',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 