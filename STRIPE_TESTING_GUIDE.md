# Stripe Connect Testing Guide

This guide will help you test your Stripe Connect integration thoroughly.

## Prerequisites

1. **Stripe Test Account**: Ensure you have a Stripe test account
2. **Environment Setup**: Configure all environment variables
3. **Database**: Run the database schema updates
4. **Webhook Setup**: Configure webhook endpoint in Stripe Dashboard

## Environment Variables Setup

Create a `.env.local` file with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Stripe Dashboard Configuration

### 1. Webhook Setup
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `http://localhost:3000/api/webhook` (for development)
4. Select events:
   - `account.updated`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the webhook secret to your `.env.local`

### 2. Connect Settings
1. Go to Stripe Dashboard → Connect → Settings
2. Configure:
   - Business type: Individual or Company
   - Statement descriptor: "Loya"
   - Support email: Your support email

## Testing Flow

### Step 1: Business Onboarding
1. **Create Business Account**
   - Go to `/business/signup`
   - Create a new business account
   - Verify business is created in Supabase

2. **Connect Stripe**
   - Go to `/business/dashboard`
   - Click "Connect Stripe"
   - Complete Stripe onboarding form
   - Verify webhook updates business status

### Step 2: Payment Processing
1. **Test Payment**
   - Use the "Demo Payment" button in business dashboard
   - Use test card: `4242 4242 4242 4242`
   - Verify payment succeeds
   - Check transaction record in database

2. **Test Failed Payment**
   - Use test card: `4000 0000 0000 0002`
   - Verify payment fails
   - Check transaction status updates

### Step 3: Cashback Verification
1. **Check User Dashboard**
   - Go to `/user/dashboard`
   - Verify cashback appears in wallet
   - Check transaction history

2. **Verify Business Dashboard**
   - Check transaction count increases
   - Verify cashback amounts are correct

## Test Cards

### Success Cards
- `4242 4242 4242 4242` - Visa (success)
- `5555 5555 5555 4444` - Mastercard (success)

### Failure Cards
- `4000 0000 0000 0002` - Generic decline
- `4000 0000 0000 9995` - Insufficient funds
- `4000 0000 0000 9987` - Lost card
- `4000 0000 0000 9979` - Stolen card

### 3D Secure Cards
- `4000 0025 0000 3155` - Requires authentication
- `4000 0027 6000 3184` - Authentication fails

## Database Verification

### Check Business Table
```sql
SELECT id, email, business_name, stripe_id, stripe_details_submitted 
FROM businesses 
WHERE stripe_id IS NOT NULL;
```

### Check Transactions Table
```sql
SELECT 
  t.id,
  t.amount,
  t.cashback_amount,
  t.platform_fee_amount,
  t.status,
  t.stripe_payment_intent_id,
  b.business_name,
  u.email as user_email
FROM transactions t
JOIN businesses b ON t.business_id = b.id
JOIN users u ON t.user_id = u.id
ORDER BY t.created_at DESC;
```

## Webhook Testing

### Test Webhook Delivery
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Click "Send test webhook"
4. Select event type and send
5. Check your server logs for webhook processing

### Monitor Webhook Failures
1. Check webhook endpoint logs
2. Verify webhook secret is correct
3. Ensure endpoint is accessible
4. Check for 200 response codes

## Common Issues & Solutions

### Issue: Business can't connect Stripe
**Solution:**
- Verify Stripe API keys are correct
- Check business exists in database
- Ensure proper error handling in `/api/account`

### Issue: Payment fails
**Solution:**
- Verify business completed Stripe onboarding
- Check payment intent creation
- Verify application fee calculation
- Check Stripe error messages

### Issue: Webhook not working
**Solution:**
- Verify webhook secret
- Check endpoint URL is correct
- Ensure server is running
- Check for CORS issues

### Issue: Cashback not calculated
**Solution:**
- Verify webhook processes `payment_intent.succeeded`
- Check transaction record creation
- Verify cashback calculation logic

## Production Checklist

Before going live:

- [ ] Switch to production Stripe keys
- [ ] Update webhook URLs to production domain
- [ ] Test with real bank accounts
- [ ] Verify compliance requirements
- [ ] Set up monitoring and alerts
- [ ] Configure proper error handling
- [ ] Test webhook reliability
- [ ] Verify payout schedules

## Monitoring

### Key Metrics to Track
- Onboarding completion rate
- Payment success rate
- Average transaction value
- Cashback distribution
- Platform fee revenue
- Webhook delivery success rate

### Stripe Dashboard Sections
- Connect → Accounts
- Payments → Payment Intents
- Developers → Webhooks
- Reports → Connect

## Support Resources

- [Stripe Connect Documentation](https://docs.stripe.com/connect)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Support](https://support.stripe.com)
- [Stripe Testing Guide](https://stripe.com/docs/testing) 