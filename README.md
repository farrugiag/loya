# Loya Auth

A loyalty and cashback platform built with Next.js, Supabase, and Stripe.

## Features

- User and business authentication
- Stripe Connect integration for payments
- Cashback and referral system
- Clean, Notion-inspired UI design

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# App URL - Update this for production
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### Production Setup

For production deployment, update the `NEXT_PUBLIC_APP_URL` to your production domain:

```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Deployment

This project is deployed on Vercel with the latest ESLint fixes applied.
