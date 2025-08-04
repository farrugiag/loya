# Stripe Webhook Setup Guide for Local Development

This guide will help you set up Stripe webhooks for local development using the Stripe CLI.

## Prerequisites

- Stripe CLI installed (✅ Already done)
- Next.js development server running
- Stripe account with test API keys

## Step 1: Stripe CLI Login

1. **Login to Stripe CLI**:
   ```bash
   .\stripe.exe login
   ```
   - This will open a browser window
   - Complete the authentication process
   - Copy the webhook signing secret when prompted

2. **Add the webhook secret to your `.env.local`**:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
   ```

## Step 2: Start Webhook Forwarding

1. **Start your Next.js development server**:
   ```bash
   npm run dev
   ```

2. **In a new terminal, start webhook forwarding**:
   ```bash
   .\stripe.exe listen --forward-to localhost:3000/api/webhook
   ```

3. **The CLI will output something like**:
   ```
   > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxx
   > Forwarding events to http://localhost:3000/api/webhook
   ```

## Step 3: Test Webhook Events

### Test Account Updates
```bash
.\stripe.exe trigger account.updated
```

### Test Payment Success
```bash
.\stripe.exe trigger payment_intent.succeeded
```

### Test Payment Failure
```bash
.\stripe.exe trigger payment_intent.payment_failed
```

## Step 4: Monitor Webhook Events

The Stripe CLI will show you:
- Incoming webhook events
- Forwarding status
- Any errors that occur

Example output:
```
2024-01-15 10:30:45   --> payment_intent.succeeded [evt_1234567890]
2024-01-15 10:30:45  <--  [200] POST http://localhost:3000/api/webhook [evt_1234567890]
```

## Step 5: Verify Webhook Processing

1. **Check your server logs** for webhook processing
2. **Verify database updates** after webhook events
3. **Test the complete flow**:
   - Create a business account
   - Connect Stripe
   - Make a test payment
   - Verify cashback calculation

## Troubleshooting

### Issue: Webhook not forwarding
**Solution:**
- Ensure Next.js server is running on port 3000
- Check that `/api/webhook` endpoint exists
- Verify webhook secret is correct

### Issue: 404 errors
**Solution:**
- Check that your webhook endpoint is accessible
- Verify the URL path is correct
- Ensure the API route is properly exported

### Issue: 500 errors
**Solution:**
- Check server logs for errors
- Verify database connection
- Ensure all required environment variables are set

## Production Setup

When deploying to production:

1. **Remove Stripe CLI forwarding**
2. **Set up webhook endpoint in Stripe Dashboard**:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhook`
   - Select events: `account.updated`, `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy the new webhook secret

3. **Update environment variables**:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_production_secret
   ```

## Testing Checklist

- [ ] Stripe CLI login successful
- [ ] Webhook forwarding active
- [ ] Test account.updated event
- [ ] Test payment_intent.succeeded event
- [ ] Test payment_intent.payment_failed event
- [ ] Database updates working
- [ ] Cashback calculations correct
- [ ] Business dashboard updates
- [ ] User dashboard updates

## Useful Commands

```bash
# List all webhook events
.\stripe.exe events list

# Get webhook endpoint details
.\stripe.exe webhook-endpoints list

# Test specific event
.\stripe.exe trigger payment_intent.succeeded

# Monitor webhooks in real-time
.\stripe.exe listen --forward-to localhost:3000/api/webhook
```

## Next Steps

Once webhooks are working locally:

1. **Test the complete business onboarding flow**
2. **Test payment processing with test cards**
3. **Verify cashback calculations**
4. **Check transaction records in database**
5. **Test error scenarios**
6. **Prepare for production deployment** 