// pages/api/products.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../lib/utils';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Create a new product
    try {
      const { name, description, price, currency = 'usd', businessId } = req.body;

      if (!name || !price || !businessId) {
        return res.status(400).json({ error: 'Missing required fields: name, price, businessId' });
      }

      // Verify business exists and has Stripe account
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('stripe_id, business_name')
        .eq('id', businessId)
        .single();

      if (businessError || !business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      if (!business.stripe_id) {
        return res.status(400).json({ error: 'Business has not completed Stripe onboarding' });
      }

      // Create product at platform level (not on connected account)
      const product = await stripe.products.create({
        name: name,
        description: description || `Product from ${business.business_name}`,
        default_price_data: {
          unit_amount: Math.round(price * 100), // Convert to cents
          currency: currency,
        },
        metadata: {
          businessId: businessId,
          businessName: business.business_name,
        },
      });

      // Store product mapping in database
      const { error: insertError } = await supabase
        .from('products')
        .insert({
          stripe_product_id: product.id,
          stripe_price_id: product.default_price as string,
          business_id: businessId,
          name: name,
          description: description || `Product from ${business.business_name}`,
          price: price,
          currency: currency,
        });

      if (insertError) {
        console.error('Failed to store product mapping:', insertError);
        // Don't fail the request, but log the error
      }

      res.status(200).json({
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.default_price,
          businessId: businessId,
        },
      });
    } catch (err: unknown) {
      console.error('Error creating product:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  } else if (req.method === 'GET') {
    // Get all products
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          businesses (
            business_name,
            stripe_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      res.status(200).json({ products });
    } catch (err: unknown) {
      console.error('Error fetching products:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 