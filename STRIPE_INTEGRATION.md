# Stripe Connect Integration Guide

This document outlines the complete Stripe Connect integration for the Loya platform, enabling businesses to accept payments and users to earn cashback.

## Overview

The integration uses Stripe Connect with Express accounts, allowing businesses to:
- Complete Stripe onboarding
- Accept payments through the platform
- Receive payouts to their bank accounts
- Track transactions and cashback

## Prerequisites

1. **Stripe Account**: Create a Stripe account at [stripe.com](https://stripe.com)
2. **Stripe Connect**: Enable Connect in your Stripe Dashboard
3. **Environment Variables**: Configure the required environment variables

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Application URLs (update for production)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Setup

Run the SQL commands in `database-schema-updates.sql` to add the required columns and policies:

```sql
-- Execute the contents of database-schema-updates.sql in your Supabase SQL editor
```

## Stripe Dashboard Configuration

### 1. Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://yourdomain.com/api/webhook`
4. Select events:
   - `account.updated`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the webhook secret to your environment variables

### 2. Connect Settings

1. Go to Stripe Dashboard → Connect → Settings
2. Configure your platform settings:
   - Business type: Individual or Company
   - Statement descriptor: "Loya"
   - Support email: Your support email

## API Endpoints

### `/api/account` (POST)
Creates or retrieves a Stripe Connect Express account for a business.

**Request Body:**
```json
{
  "merchantId": "business_user_id"
}
```

**Response:**
```json
{
  "accountId": "acct_...",
  "onboardingUrl": "https://connect.stripe.com/..."
}
```

### `/api/create-payment-intent` (POST)
Creates a payment intent for processing payments.

**Request Body:**
```json
{
  "amount": 10.00,
  "businessId": "business_user_id",
  "userId": "user_id",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "clientSecret": "pi_..._secret_...",
  "paymentIntentId": "pi_..."
}
```

### `/api/webhook` (POST)
Handles Stripe webhook events for account updates and payment status.

## Frontend Components

### PaymentForm Component
Located at `components/PaymentForm.tsx`, this component provides:
- Stripe Elements integration
- Card input validation
- Payment processing
- Error handling

**Usage:**
```tsx
import PaymentForm from '../components/PaymentForm';

<PaymentForm
  amount={10.00}
  businessId="business_id"
  userId="user_id"
  description="Test payment"
  onSuccess={(paymentIntentId) => console.log('Payment successful:', paymentIntentId)}
  onError={(error) => console.error('Payment failed:', error)}
/>
```

## Business Onboarding Flow

1. **Business Signup**: Business creates account
2. **Stripe Connection**: Business clicks "Connect Stripe" in dashboard
3. **Account Creation**: System creates Stripe Express account
4. **Onboarding**: Business completes Stripe onboarding form
5. **Verification**: Webhook updates business status
6. **Ready**: Business can now accept payments

## Payment Flow

1. **Payment Initiation**: User initiates payment through PaymentForm
2. **Intent Creation**: System creates payment intent with application fee
3. **Payment Processing**: Stripe processes the payment
4. **Fund Transfer**: Funds are transferred to business account (minus platform fee)
5. **Cashback Calculation**: System calculates and records cashback
6. **Transaction Recording**: Transaction is recorded in database

## Testing

### Test Cards
Use these test card numbers for development:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Insufficient Funds**: `4000 0000 0000 9995`

### Test Bank Accounts
For Connect payouts, use these test bank accounts:
- **Success**: `000123456789`
- **Decline**: `000000000000`

## Production Deployment

### 1. Update Environment Variables
- Use production Stripe keys
- Update webhook URLs to production domain
- Set proper redirect URLs

### 2. Database Migration
- Run database schema updates in production
- Verify RLS policies are in place

### 3. Webhook Configuration
- Update webhook endpoint URL
- Test webhook delivery
- Monitor webhook failures

### 4. Security Considerations
- Ensure all API keys are secure
- Use HTTPS for all endpoints
- Implement proper error handling
- Monitor for suspicious activity

## Monitoring and Analytics

### Key Metrics to Track
- Onboarding completion rate
- Payment success rate
- Average transaction value
- Cashback distribution
- Platform fee revenue

### Stripe Dashboard
Monitor these sections in Stripe Dashboard:
- Connect → Accounts
- Payments → Payment Intents
- Developers → Webhooks
- Reports → Connect

## Troubleshooting

### Common Issues

1. **Webhook Failures**
   - Check webhook endpoint URL
   - Verify webhook secret
   - Check server logs for errors

2. **Payment Failures**
   - Verify business has completed onboarding
   - Check payment intent creation
   - Review Stripe error messages

3. **Account Creation Issues**
   - Verify Stripe API keys
   - Check business data completeness
   - Review Stripe account requirements

### Support Resources
- [Stripe Connect Documentation](https://docs.stripe.com/connect)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Support](https://support.stripe.com)

## Security Best Practices

1. **Never expose secret keys** in client-side code
2. **Always verify webhook signatures**
3. **Use HTTPS** for all production endpoints
4. **Implement proper error handling**
5. **Monitor for suspicious activity**
6. **Regularly rotate API keys**
7. **Use environment variables** for sensitive data

## Compliance

Ensure compliance with:
- PCI DSS requirements
- Local payment regulations
- Data protection laws (GDPR, etc.)
- Financial services regulations

## Next Steps

After completing this integration, consider:
1. Adding subscription support
2. Implementing refund functionality
3. Adding dispute handling
4. Creating payout management
5. Building analytics dashboard
6. Adding multi-currency support 