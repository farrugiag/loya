-- Add website field to businesses table for merchant websites
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website TEXT;

-- Add comment to document the field
COMMENT ON COLUMN businesses.website IS 'Merchant website URL for customer visits'; 