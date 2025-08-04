import { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

interface PaymentFormProps {
  amount: number;
  businessId: string;
  userId: string;
  description?: string;
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
}

function CheckoutForm({ amount, businessId, userId, description, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          businessId,
          userId,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      // Confirm payment
      const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message || 'Payment failed');
      }

      onSuccess?.(data.paymentIntentId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>
          Payment Details - ${amount.toFixed(2)}
        </h3>
        <div style={{
          padding: '1rem',
          border: '1px solid #444',
          borderRadius: '4px',
          backgroundColor: '#1a1a1a',
          marginBottom: '1rem'
        }}>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#ffffff',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#fa755a',
                  iconColor: '#fa755a',
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div style={{ color: '#fa755a', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: loading ? '#444' : '#00c36d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '1rem',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  );
}

export default function PaymentForm(props: PaymentFormProps) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      setError('Stripe publishable key is not configured');
      return;
    }

    if (!publishableKey.startsWith('pk_')) {
      setError('Invalid Stripe publishable key format');
      return;
    }

    try {
      const promise = loadStripe(publishableKey);
      setStripePromise(promise);
    } catch (err) {
      setError('Failed to load Stripe');
      console.error('Stripe loading error:', err);
    }
  }, []);

  if (error) {
    return (
      <div style={{ 
        maxWidth: '400px', 
        margin: '0 auto', 
        padding: '1rem',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '4px',
        color: '#dc2626'
      }}>
        <p><strong>Stripe Error:</strong> {error}</p>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Please check your environment variables and restart the development server.
        </p>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div style={{ 
        maxWidth: '400px', 
        margin: '0 auto', 
        padding: '1rem',
        backgroundColor: '#f3f4f6',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        color: '#374151'
      }}>
        <p>Loading Stripe...</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
} 