import { Client, Environment } from '@finix-payments/finix';

// Initialize Finix client
export const finix = new Client(
  process.env.FINIX_USERNAME!,
  process.env.FINIX_PASSWORD!,
  process.env.NODE_ENV === 'production' ? Environment.Live : Environment.Sandbox
);

// Helper function to get the correct API URL based on environment
export const getFinixApiUrl = () => {
  return process.env.NODE_ENV === 'production' 
    ? 'https://finix-payments-api.com' 
    : 'https://finix.sandbox-payments-api.com';
}; 