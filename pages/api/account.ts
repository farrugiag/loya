// pages/api/account.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../lib/utils';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { merchantId } = req.body;

if (!merchantId) {
  return res.status(400).json({ error: 'Missing merchantId' });
}

const { data: merchant, error } = await supabase
  .from('merchants')
  .select('business_name, email, website, support_email, stripe_id')
  .eq('id', merchantId)
  .single();

if (error) {
  console.warn('Merchant fetch failed:', error.message);
}

// ✅ Reuse account if already created
if (merchant?.stripe_id) {
  const accountLink = await stripe.accountLinks.create({
    account: merchant.stripe_id,
    refresh_url: 'http://localhost:3000/reauth',
    return_url: 'http://localhost:3000/business/dashboard',
    type: 'account_onboarding',
  });

  return res.status(200).json({
    accountId: merchant.stripe_id,
    onboardingUrl: accountLink.url,
  });
}


    // Create Stripe account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: merchant?.email || undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: merchant?.business_name || undefined,
        url: merchant?.website || undefined,
        support_email: merchant?.support_email || merchant?.email || undefined,
        product_description: 'Loyalty-enabled e-commerce store',
      },
      metadata: {
        merchantId,
      },
    });

    // Save Stripe account ID to merchant
    const { error: updateError } = await supabase
      .from('merchants')
      .update({ stripe_id: account.id })
      .eq('id', merchantId);

    if (updateError) {
      console.error('Failed to save Stripe account ID:', updateError.message);
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'http://localhost:3000/reauth',
      return_url: 'http://localhost:3000/business/dashboard',
      type: 'account_onboarding',
    });

    // Send both account ID and onboarding URL
    return res.status(200).json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
    });
  } catch (err: any) {
    console.error('Error creating Stripe account:', err);
    return res.status(500).json({ error: err.message });
  }
}
