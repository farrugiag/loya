// pages/api/account.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { finix } from '../../lib/finixClient';
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
      .select('business_name, email, website, support_email, finix_identity_id')
      .eq('id', merchantId)
      .single();

    if (error) {
      console.warn('Business fetch failed:', error.message);
    }

    // ✅ Reuse identity if already created
    if (business?.finix_identity_id) {
      // For Finix, we need to create a new application link for onboarding
      const applicationLink = await finix.applicationLinks.create({
        application: process.env.FINIX_APPLICATION_ID!,
        type: 'IDENTITY_VERIFICATION',
        identity: business.finix_identity_id,
        return_url: 'http://localhost:3000/business/dashboard',
        refresh_url: 'http://localhost:3000/reauth',
      });

      return res.status(200).json({
        identityId: business.finix_identity_id,
        onboardingUrl: applicationLink.url,
      });
    }

    // Create Finix Identity (equivalent to Stripe account)
    const identity = await finix.identities.create({
      entity: {
        annual_card_volume: 12000000, // $120k annual volume
        business_address: {
          city: 'San Francisco', // Default - should be updated with real data
          country: 'USA',
          region: 'CA',
          line1: '123 Business St',
          postal_code: '94102'
        },
        business_name: business?.business_name || 'Loya Business',
        business_phone: '+1 (555) 123-4567', // Default - should be updated
        business_tax_id: '123456789', // Default - should be updated
        business_type: 'INDIVIDUAL_SOLE_PROPRIETORSHIP',
        default_statement_descriptor: business?.business_name || 'Loya Business',
        dob: {
          year: 1990, // Default - should be updated
          day: 1,
          month: 1
        },
        doing_business_as: business?.business_name || 'Loya Business',
        email: business?.email || '',
        first_name: 'Business', // Default - should be updated
        has_accepted_credit_cards_previously: true,
        incorporation_date: {
          year: 2020, // Default - should be updated
          day: 1,
          month: 1
        },
        last_name: 'Owner', // Default - should be updated
        max_transaction_amount: 12000000,
        mcc: '4900', // Utilities
        ownership_type: 'PRIVATE',
        personal_address: {
          city: 'San Francisco', // Default - should be updated
          country: 'USA',
          region: 'CA',
          line1: '123 Personal St',
          postal_code: '94102'
        },
        phone: '1234567890', // Default - should be updated
        principal_percentage_ownership: 100,
        tax_id: '123456789', // Default - should be updated
        title: 'CEO',
        url: business?.website || 'www.loya.com'
      },
      additional_underwriting_data: {
        annual_ach_volume: 200000,
        average_ach_transfer_amount: 200000,
        average_card_transfer_amount: 200000,
        business_description: 'Loyalty-enabled e-commerce store',
        card_volume_distribution: {
          card_present_percentage: 30,
          mail_order_telephone_order_percentage: 10,
          ecommerce_percentage: 60
        },
        credit_check_allowed: true,
        credit_check_ip_address: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1',
        credit_check_timestamp: new Date().toISOString(),
        credit_check_user_agent: req.headers['user-agent'] || 'Unknown',
        merchant_agreement_accepted: true,
        merchant_agreement_ip_address: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1',
        merchant_agreement_timestamp: new Date().toISOString(),
        merchant_agreement_user_agent: req.headers['user-agent'] || 'Unknown',
        refund_policy: 'MERCHANDISE_EXCHANGE_ONLY',
        volume_distribution_by_business_type: {
          other_volume_percentage: 0,
          consumer_to_consumer_volume_percentage: 0,
          business_to_consumer_volume_percentage: 100,
          business_to_business_volume_percentage: 0,
          person_to_person_volume_percentage: 0
        }
      }
    });

    // Save Finix identity ID to business
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ finix_identity_id: identity.id })
      .eq('id', merchantId);

    if (updateError) {
      console.error('Failed to save Finix identity ID:', updateError.message);
    }

    // Create application link for onboarding
    const applicationLink = await finix.applicationLinks.create({
      application: process.env.FINIX_APPLICATION_ID!,
      type: 'IDENTITY_VERIFICATION',
      identity: identity.id,
      return_url: 'http://localhost:3000/business/dashboard',
      refresh_url: 'http://localhost:3000/reauth',
    });

    // Send both identity ID and onboarding URL
    return res.status(200).json({
      identityId: identity.id,
      onboardingUrl: applicationLink.url,
    });
  } catch (err: unknown) {
    console.error('Error creating Finix identity:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
