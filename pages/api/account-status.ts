// pages/api/account-status.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../lib/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accountId } = req.query;

    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({ error: 'Missing accountId parameter' });
    }

    // Get account status directly from Stripe API
    const account = await stripe.accounts.retrieve(accountId);

    // Extract relevant status information
    const status = {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements,
      business_profile: account.business_profile,
      capabilities: account.capabilities,
    };

    res.status(200).json(status);
  } catch (err: unknown) {
    console.error('Error retrieving account status:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
} 