-- Database schema updates for Loya app

-- Add Stripe Connect fields to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE;

-- Create index for stripe_id lookups
CREATE INDEX IF NOT EXISTS idx_businesses_stripe_id ON businesses(stripe_id);

-- Add Stripe customer field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create index for stripe_customer_id lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Create products table for Stripe Connect integration
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_product_id TEXT UNIQUE NOT NULL,
  stripe_price_id TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_stripe_product_id ON products(stripe_product_id);

-- Add RLS policies for products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow businesses to see their own products
CREATE POLICY "Businesses can view their own products" ON products
  FOR SELECT USING (auth.uid() = business_id);

-- Allow businesses to insert their own products
CREATE POLICY "Businesses can insert their own products" ON products
  FOR INSERT WITH CHECK (auth.uid() = business_id);

-- Allow businesses to update their own products
CREATE POLICY "Businesses can update their own products" ON products
  FOR UPDATE USING (auth.uid() = business_id);

-- Allow businesses to delete their own products
CREATE POLICY "Businesses can delete their own products" ON products
  FOR DELETE USING (auth.uid() = business_id);

-- Allow all authenticated users to view products (for store)
CREATE POLICY "All users can view products" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

-- Update function to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for products table
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint to prevent duplicate transactions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_stripe_payment_intent_id'
    ) THEN
        ALTER TABLE transactions ADD CONSTRAINT unique_stripe_payment_intent_id UNIQUE (stripe_payment_intent_id);
    END IF;
END $$;

-- Add website field to businesses table for merchant websites
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website TEXT;
-- Add comment to document the field
COMMENT ON COLUMN businesses.website IS 'Merchant website URL for customer visits'; 