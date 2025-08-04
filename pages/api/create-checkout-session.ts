// pages/api/create-checkout-session.ts

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
    const { productId, quantity = 1, userId, savePaymentMethod = false } = req.body;

    if (!productId || !userId) {
      return res.status(400).json({ error: 'Missing required fields: productId, userId' });
    }

    // Get user details from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get product details from database
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        businesses (
          stripe_id,
          business_name
        )
      `)
      .eq('stripe_product_id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!product.businesses?.stripe_id) {
      return res.status(400).json({ error: 'Business has not completed Stripe onboarding' });
    }

    // Calculate application fee (10% platform fee)
    const unitAmount = Math.round(product.price * 100); // Convert to cents
    const totalAmount = unitAmount * quantity;
    const applicationFeeAmount = Math.round(totalAmount * 0.10); // 10% platform fee

    // Create or get Stripe customer
    let customer;
    const { data: existingCustomer } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      customer = await stripe.customers.retrieve(existingCustomer.stripe_customer_id);
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || undefined,
        metadata: {
          userId: userId,
        },
      });

      // Save Stripe customer ID to database
      await supabase
        .from('users')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);
    }

    // Create checkout session with destination charge
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      // Customize payment methods - only show card and Link
      payment_method_types: ['card', 'link'],
      line_items: [
        {
          price_data: {
            currency: product.currency,
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: unitAmount,
          },
          quantity: quantity,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: product.businesses.stripe_id,
        },
        metadata: {
          productId: productId,
          businessId: product.business_id,
          userId: userId,
        },
        // This will save the payment method for future use
        setup_future_usage: savePaymentMethod ? 'off_session' : undefined,
      },
      mode: 'payment',
      success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}/store`,
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      // Customize the checkout page
      billing_address_collection: 'auto',
      allow_promotion_codes: false,
      metadata: {
        productId: productId,
        businessId: product.business_id,
        userId: userId,
        savePaymentMethod: savePaymentMethod.toString(),
      },
    });

    res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (err: unknown) {
    console.error('Error creating checkout session:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
} 