// pages/business/dashboard.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function BusinessDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    const getSessionAndCheckStripe = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.replace('/business/login');
        return;
      }

      setUser(session.user);

      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('stripe_id, stripe_details_submitted')
        .eq('id', session.user.id)
        .single();

      if (bizError) {
        console.warn('Failed to fetch business:', bizError.message);
      } else {
        setStripeConnected(!!business?.stripe_details_submitted);
      }

      setLoading(false);
    };

    getSessionAndCheckStripe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/business/login');
  };

  const createStripeAccount = async () => {
    setConnectingStripe(true);

    const res = await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId: user?.id }),
    });

    const data = await res.json();
    if (res.ok && data.onboardingUrl) {
      window.location.href = data.onboardingUrl;
    } else {
      console.error('Stripe onboarding error:', data.error);
      alert('Stripe onboarding failed. Try again.');
      setConnectingStripe(false);
    }
  };

  if (loading) {
    return <p style={{ color: 'white', padding: '2rem' }}>Loading dashboard…</p>;
  }

  return (
    <div style={{ padding: '2rem', color: 'white', textAlign: 'center' }}>
      <h1>Business Dashboard</h1>
      <p>Welcome, {user.email}</p>

      {stripeConnected ? (
        <p style={{ marginTop: '1rem', color: '#00c36d' }}>
          ✅ Your Stripe account is connected
        </p>
      ) : (
        <button
          onClick={createStripeAccount}
          disabled={connectingStripe}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            background: connectingStripe ? '#555' : '#635bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: connectingStripe ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          {connectingStripe ? 'Connecting to Stripe…' : 'Connect Stripe'}
        </button>
      )}

      <button
        onClick={handleLogout}
        style={{
          marginTop: '2rem',
          padding: '0.5rem 1rem',
          background: '#00c36d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Log out
      </button>
    </div>
  );
}
