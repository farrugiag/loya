# Stripe Connect Integration Testing Guide

This guide will help you test the complete Stripe Connect integration in your Loya app.

## Prerequisites

1. **Stripe Account Setup**
   - Create a Stripe account at https://dashboard.stripe.com
   - Get your API keys from the Stripe Dashboard
   - Set up environment variables:
     ```
     STRIPE_SECRET_KEY=sk_test_...
     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
     ```

2. **Database Setup**
   - Run the database schema updates:
     ```sql
     -- Execute the contents of database-schema-updates.sql
     ```

3. **Environment Variables**
   - Ensure all required environment variables are set in your `.env.local` file

## Testing Flow

### 1. Business Onboarding

**Step 1: Create Business Account**
1. Go to `/business/signup`
2. Create a new business account
3. Log in to the business dashboard

**Step 2: Connect Stripe Account**
1. In the business dashboard, click "Connect Stripe"
2. You'll be redirected to Stripe's onboarding flow
3. Complete the onboarding process:
   - Business information
   - Bank account details
   - Identity verification (use test data)

**Step 3: Verify Account Status**
1. Return to your business dashboard
2. Check the "Account Status" section
3. Verify that:
   - Charges Enabled: ✅ Yes
   - Payouts Enabled: ✅ Yes
   - Details Submitted: ✅ Yes

### 2. Product Creation

**Step 1: Create Products**
1. In the business dashboard, click "Add Product"
2. Fill in the product form:
   - Name: "Test Product"
   - Description: "A test product for Stripe Connect"
   - Price: $10.00
3. Click "Create Product"
4. Verify success message

**Step 2: Verify Product Creation**
1. Check that the product appears in your dashboard
2. The product should be created in Stripe at the platform level
3. The product mapping should be stored in your database

### 3. Customer Purchase Flow

**Step 1: Access Store**
1. Go to `/store` (or `/user/dashboard` and navigate to store)
2. You should see all products from all connected businesses
3. Verify your test product is displayed

**Step 2: Make a Purchase**
1. Click "Purchase Now" on your test product
2. You'll be redirected to Stripe Checkout
3. Use test card: `4242 4242 4242 4242`
4. Complete the purchase

**Step 3: Verify Success**
1. You should be redirected to `/success`
2. Check that the payment was processed
3. Verify the transaction appears in your business dashboard

### 4. Payment Verification

**Step 1: Check Stripe Dashboard**
1. Log into your Stripe Dashboard
2. Go to "Connect" → "Accounts"
3. Find your connected account
4. Check "Payments" section for the test transaction

**Step 2: Verify Application Fees**
1. In the Stripe Dashboard, check the payment details
2. Verify that application fees were collected (10% platform fee)
3. Check that the remaining amount was transferred to the connected account

**Step 3: Check Business Dashboard**
1. Return to your business dashboard
2. Verify the transaction appears in the transaction history
3. Check that cashback amounts are calculated correctly

## Test Cards

Use these test cards for different scenarios:

### Successful Payments
- `4242 4242 4242 4242` - Visa (successful)
- `4000 0000 0000 0002` - Visa (successful)
- `5555 5555 5555 4444` - Mastercard (successful)

### Failed Payments
- `4000 0000 0000 0002` - Declined
- `4000 0000 0000 9995` - Insufficient funds
- `4000 0000 0000 9987` - Lost card

### 3D Secure
- `4000 0025 0000 3155` - Requires authentication
- `4000 0027 6000 3184` - Requires authentication

## Testing Checklist

### Business Onboarding
- [ ] Business can create Stripe Connect account
- [ ] Onboarding flow completes successfully
- [ ] Account status shows all requirements met
- [ ] Business can access Express Dashboard

### Product Management
- [ ] Business can create products
- [ ] Products are created at platform level
- [ ] Product mapping is stored in database
- [ ] Products appear in store

### Customer Purchase
- [ ] Customers can browse all products
- [ ] Checkout session is created successfully
- [ ] Payment processing works with test cards
- [ ] Success page displays correctly
- [ ] Transaction appears in business dashboard

### Payment Processing
- [ ] Application fees are collected correctly
- [ ] Funds are transferred to connected account
- [ ] Transaction metadata is preserved
- [ ] Cashback calculations are correct

### Error Handling
- [ ] Failed payments are handled gracefully
- [ ] Invalid product IDs show appropriate errors
- [ ] Missing business onboarding shows error
- [ ] Network errors are handled properly

## Common Issues and Solutions

### Issue: "Business has not completed Stripe onboarding"
**Solution:** Complete the Stripe onboarding flow in the business dashboard

### Issue: "Product not found"
**Solution:** Ensure the product was created successfully and the Stripe product ID is correct

### Issue: "Failed to create checkout session"
**Solution:** Check that the business has a valid Stripe account ID and the product exists

### Issue: Payment fails with "card_declined"
**Solution:** Use a different test card or check the specific decline reason in Stripe Dashboard

### Issue: Account status not updating
**Solution:** The status is fetched directly from Stripe API - ensure the account ID is correct

## Production Checklist

Before going to production:

- [ ] Switch to production Stripe keys
- [ ] Update webhook URLs to production domain
- [ ] Test with real bank account information
- [ ] Verify compliance requirements are met
- [ ] Set up proper error monitoring
- [ ] Test webhook handling for payment events
- [ ] Verify tax calculation and reporting
- [ ] Test refund and dispute handling

## Support

If you encounter issues:

1. Check the browser console for errors
2. Verify all environment variables are set correctly
3. Check Stripe Dashboard for detailed error messages
4. Review the Stripe Connect documentation
5. Test with Stripe's test mode first

## Additional Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Connect Onboarding](https://stripe.com/docs/connect/onboarding) 