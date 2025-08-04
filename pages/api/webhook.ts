// pages/api/webhook.ts

import { buffer } from 'micro';
import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../lib/utils';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'] as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'account.updated':
        const account = event.data.object;
        
        // Update business record when Stripe account is updated
        if (account.details_submitted) {
          const { error } = await supabase
            .from('businesses')
            .update({ 
              stripe_details_submitted: true,
              stripe_charges_enabled: account.charges_enabled,
              stripe_payouts_enabled: account.payouts_enabled
            })
            .eq('stripe_id', account.id);

          if (error) {
            console.error('Failed to update business Stripe status:', error);
          } else {
            console.log('Updated business Stripe status for account:', account.id);
          }
        }
        break;

      case 'payment_intent.succeeded':
        // Handle successful payments
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        
        // Update transaction status and calculate cashback
        if (paymentIntent.metadata?.businessId && paymentIntent.metadata?.userId) {
          const amount = paymentIntent.amount / 100; // Convert from cents
          const cashbackAmount = amount * 0.05; // 5% cashback
          
          const { error: updateError } = await supabase
            .from('transactions')
            .update({
              status: 'completed',
              cashback_amount: cashbackAmount,
              updated_at: new Date().toISOString()
            })
            .eq('stripe_payment_intent_id', paymentIntent.id);

          if (updateError) {
            console.error('Failed to update transaction:', updateError);
          } else {
            console.log('Updated transaction for payment:', paymentIntent.id);
          }
        }

        // Handle saving payment method if requested
        if (paymentIntent.metadata?.savePaymentMethod === 'true' && paymentIntent.payment_method) {
          try {
            // Attach the payment method to the customer
            await stripe.paymentMethods.attach(paymentIntent.payment_method, {
              customer: paymentIntent.customer,
            });
            
            // Set as default payment method
            await stripe.customers.update(paymentIntent.customer, {
              invoice_settings: {
                default_payment_method: paymentIntent.payment_method,
              },
            });
            
            console.log('Payment method saved for customer:', paymentIntent.customer);
          } catch (error) {
            console.error('Failed to save payment method:', error);
          }
        }
        break;

      case 'payment_intent.payment_failed':
        // Handle failed payments
        const failedPayment = event.data.object;
        console.log('Payment failed:', failedPayment.id);
        
        // Update transaction status to failed
        const { error: failError } = await supabase
          .from('transactions')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payment_intent_id', failedPayment.id);

        if (failError) {
          console.error('Failed to update failed transaction:', failError);
        }
        break;



      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}
