-- Stripe Integration Database Schema Updates

-- Add Stripe-related columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS stripe_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS support_email TEXT;

-- Add Stripe-related columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_businesses_stripe_id ON businesses(stripe_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_payment_intent ON transactions(stripe_payment_intent_id);

-- Add RLS policies for Stripe data
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Business owners can view their own Stripe data
CREATE POLICY "Business owners can view own stripe data" ON businesses
  FOR SELECT USING (auth.uid() = id);

-- Business owners can update their own Stripe data
CREATE POLICY "Business owners can update own stripe data" ON businesses
  FOR UPDATE USING (auth.uid() = id);

-- Business owners can view transactions for their business
CREATE POLICY "Business owners can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = business_id);

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id); 