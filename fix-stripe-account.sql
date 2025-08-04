-- Fix Stripe Account ID Script
-- Run this in your Supabase Dashboard SQL Editor

-- First, check what account ID is currently stored
SELECT id, email, business_name, stripe_id, stripe_details_submitted, stripe_charges_enabled, stripe_payouts_enabled
FROM businesses 
WHERE stripe_id IS NOT NULL;

-- Update the account ID to the correct one (replace YOUR_BUSINESS_ID with your actual business ID)
-- Based on the Stripe CLI output, the correct account ID appears to be: acct_1RonxWELRkcaDPY5KVbOYiUN

UPDATE businesses 
SET stripe_id = 'acct_1RonxWELRkcaDPY5KVbOYiUN',
    stripe_details_submitted = true,
    stripe_charges_enabled = true,
    stripe_payouts_enabled = true
WHERE id = 'YOUR_BUSINESS_ID'; -- Replace with your actual business ID

-- Verify the update
SELECT id, email, business_name, stripe_id, stripe_details_submitted, stripe_charges_enabled, stripe_payouts_enabled
FROM businesses 
WHERE id = 'YOUR_BUSINESS_ID'; -- Replace with your actual business ID 