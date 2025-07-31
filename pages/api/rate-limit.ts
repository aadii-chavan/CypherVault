import { NextApiRequest, NextApiResponse } from 'next';
import { checkRateLimit } from '@/lib/rateLimit';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { identifier } = req.body;
    
    if (!identifier) {
      return res.status(400).json({ error: 'Identifier is required' });
    }

    const result = await checkRateLimit(identifier);
    
    // Set rate limit headers
    Object.entries(result.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    return res.status(200).json({
      success: result.success,
      limit: result.limit,
      reset: result.reset,
      remaining: result.remaining,
    });
  } catch (error) {
    console.error('Rate limit error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 