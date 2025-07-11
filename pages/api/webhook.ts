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
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', errorMessage);
    return res.status(400).send(`Webhook Error: ${errorMessage}`);
  }

  // Handle different event types
  switch (event.type) {
    case 'account.updated':
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
      break;

    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { businessId, userId, description } = paymentIntent.metadata;

      if (businessId && userId) {
        // Calculate cashback (example: 5% of transaction amount)
        const amount = paymentIntent.amount / 100; // Convert from cents
        const cashbackAmount = amount * 0.05;

        // Record transaction in database
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            id: paymentIntent.id,
            business_id: businessId,
            user_id: userId,
            amount: amount.toString(),
            cashback_earned: cashbackAmount.toString(),
            cashback_used: '0',
            referral_reward: '0',
            status: 'completed',
            stripe_payment_intent_id: paymentIntent.id,
          });

        if (txError) {
          console.error('Failed to record transaction:', txError.message);
          return res.status(500).send('Failed to record transaction');
        }

        console.log(`✅ Payment completed: ${paymentIntent.id} for business ${businessId}`);
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      console.log(`❌ Payment failed: ${failedPayment.id} - ${failedPayment.last_payment_error?.message}`);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).send('Webhook received');
}
