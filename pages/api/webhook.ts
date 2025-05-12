// pages/api/webhook.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false, // Needed for Stripe signature verification
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature']!;
  const buf = await buffer(req);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Only listen for account updates
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;

    if (account.details_submitted && account.metadata?.merchantId) {
      const { error } = await supabase
        .from('businesses')
        .update({ stripe_details_submitted: true })
        .eq('id', account.metadata.merchantId);

      if (error) {
        console.error('Failed to update merchant onboarding status:', error.message);
        return res.status(500).send('Failed to update status');
      }

      console.log(`✅ Stripe onboarding completed for merchant ${account.metadata.merchantId}`);
    }
  }

  res.status(200).send('Webhook received');
}
