import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-07-30.basil',
});

// Utility function to get the app URL from environment variables
export const getAppUrl = (): string => {
  // For development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // For production, use the environment variable or fallback
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};
