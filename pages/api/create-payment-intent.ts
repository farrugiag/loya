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
    const { amount, businessId, userId, description } = req.body;

    if (!amount || !businessId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify business has completed Stripe onboarding
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('stripe_id, stripe_details_submitted')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    if (!business.stripe_details_submitted) {
      return res.status(400).json({ error: 'Business has not completed Stripe onboarding' });
    }

    // Create payment intent with application fee (platform fee)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      application_fee_amount: Math.round(amount * 10), // 10% platform fee
      transfer_data: {
        destination: business.stripe_id,
      },
      metadata: {
        businessId,
        userId,
        description: description || 'Loya transaction',
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: unknown) {
    console.error('Error creating payment intent:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
} 