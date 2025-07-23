// pages/api/account.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe, getAppUrl } from '../../lib/utils';
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

const { data: business, error } = await supabase
  .from('businesses')
  .select('business_name, email, website, support_email, stripe_id')
  .eq('id', merchantId)
  .single();

if (error) {
  console.warn('Business fetch failed:', error.message);
}

// ✅ Reuse account if already created
if (business?.stripe_id) {
  const accountLink = await stripe.accountLinks.create({
    account: business.stripe_id,
    refresh_url: `${getAppUrl()}/reauth`,
    return_url: `${getAppUrl()}/business/dashboard`,
    type: 'account_onboarding',
  });

  return res.status(200).json({
    accountId: business.stripe_id,
    onboardingUrl: accountLink.url,
  });
}


    // Create Stripe account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: business?.email || undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: business?.business_name || undefined,
        url: business?.website || undefined,
        support_email: business?.support_email || business?.email || undefined,
        product_description: 'Loyalty-enabled e-commerce store',
      },
      metadata: {
        merchantId,
      },
    });

    // Save Stripe account ID to business
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ stripe_id: account.id })
      .eq('id', merchantId);

    if (updateError) {
      console.error('Failed to save Stripe account ID:', updateError.message);
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${getAppUrl()}/reauth`,
      return_url: `${getAppUrl()}/business/dashboard`,
      type: 'account_onboarding',
    });

    // Send both account ID and onboarding URL
    return res.status(200).json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
    });
  } catch (err: unknown) {
    console.error('Error creating Stripe account:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
