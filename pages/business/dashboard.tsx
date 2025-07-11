import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import useRoleGuard from '../../hooks/useRoleGuard';
import { User } from '@supabase/supabase-js';

interface Transaction {
  id: string;
  created_at: string;
  amount: string;
  cashback_earned: string;
  cashback_used: string;
  referral_reward: string;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export default function BusinessDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [transactionCount, setTransactionCount] = useState<number | null>(null);
  const [totalCashbackEarned, setTotalCashbackEarned] = useState<number | null>(null);
  const [totalCashbackUsed, setTotalCashbackUsed] = useState<number | null>(null);
  const [referralEarnings, setReferralEarnings] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showPaymentDemo, setShowPaymentDemo] = useState(false);
  const { checking, blocked, logoutAndReload } = useRoleGuard('business');

  useEffect(() => {
    if (checking || blocked) return;

    const getSessionAndCheckStripe = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.replace('/business/login');
        return;
      }

      setUser(session.user);

      // Fetch business (assuming business_id is auth.uid())
      const business_id = session.user.id;

      // No need to fetch business row if business_id is auth.uid() for RLS
      // But if you want to fetch for stripe, you can:
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('stripe_id, stripe_details_submitted')
        .eq('id', business_id)
        .single();

      if (bizError) {
        console.warn('Failed to fetch business:', bizError.message);
      } else {
        setStripeConnected(!!business?.stripe_details_submitted);
      }

      // Fetch transactions + client info
      const { data: txs, error: txError } = await supabase
        .from('transactions')
        .select(`
          id, created_at, amount, cashback_earned, cashback_used, referral_reward,
          user:user_id (
            first_name, last_name, email
          )
        `)
        .eq('business_id', business_id);
        console.log('Transactions with user info:', txs);


      if (!txError && txs) {
        setTransactions(txs as unknown as Transaction[]);
        setTransactionCount(txs.length);
        setTotalCashbackUsed(txs.reduce((sum, tx) => sum + (parseFloat(tx.cashback_used) || 0), 0));
        setTotalCashbackEarned(txs.reduce((sum, tx) => sum + (parseFloat(tx.cashback_earned) || 0), 0));
        setReferralEarnings(txs.reduce((sum, tx) => sum + (parseFloat(tx.referral_reward) || 0), 0));
      }

      setLoading(false);
    };

    getSessionAndCheckStripe();
  }, [checking, blocked, router]);

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

  if (checking) return <p style={{ color: 'white', padding: '2rem' }}>Checking access…</p>;

  if (blocked) {
    return (
      <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>
        <h2>Access Denied</h2>
        <p>You are not authorized to access the business dashboard.</p>
        <button
          onClick={logoutAndReload}
          style={{
            marginTop: '1rem',
            background: '#f87171',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Log out
        </button>
      </div>
    );
  }

  if (loading || !user) {
    return <p style={{ color: 'white', padding: '2rem' }}>Loading dashboard…</p>;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div style={{
        background: '#121212',
        borderRadius: '16px',
        padding: '2rem 3rem',
        width: '100%',
        maxWidth: '900px',
        boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        textAlign: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          Business Dashboard
        </h1>
        <p style={{ color: '#ccc', marginBottom: '2rem' }}>
          Welcome, <strong>{user.email}</strong>
        </p>

        {stripeConnected ? (
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ color: '#00c36d', marginBottom: '1rem' }}>
              ✅ Your Stripe account is connected
            </p>
            <div style={{ 
              background: '#1e1e1e', 
              padding: '1rem', 
              borderRadius: '8px',
              border: '1px solid #333'
            }}>
              <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Test Payment</h3>
              <p style={{ color: '#ccc', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Use test card: 4242 4242 4242 4242
              </p>
              <button
                onClick={() => setShowPaymentDemo(true)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#00c36d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Demo Payment
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={createStripeAccount}
            disabled={connectingStripe}
            style={{
              marginBottom: '2rem',
              padding: '0.75rem 1.5rem',
              background: connectingStripe ? '#444' : '#635bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: connectingStripe ? 'not-allowed' : 'pointer'
            }}
          >
            {connectingStripe ? 'Connecting to Stripe…' : 'Connect Stripe'}
          </button>
        )}

        {/* Stats */}
        <div style={{ marginTop: '2rem', textAlign: 'left', color: 'white' }}>
          <h2 style={{ color: '#00c36d', fontSize: '1.25rem', marginBottom: '1.5rem' }}>
            Your Stats
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem'
          }}>
            <div style={{ background: '#1e1e1e', padding: '1rem', borderRadius: '8px' }}>
              <p style={{ marginBottom: '0.5rem', color: '#888' }}>Total Transactions</p>
              <p style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{transactionCount ?? '—'}</p>
            </div>
            <div style={{ background: '#1e1e1e', padding: '1rem', borderRadius: '8px' }}>
              <p style={{ marginBottom: '0.5rem', color: '#888' }}>Cashback Given to Users</p>
              <p style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>${totalCashbackEarned?.toFixed(2) ?? '—'}</p>
            </div>
            <div style={{ background: '#1e1e1e', padding: '1rem', borderRadius: '8px' }}>
              <p style={{ marginBottom: '0.5rem', color: '#888' }}>Cashback Redeemed by Users</p>
              <p style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>${totalCashbackUsed?.toFixed(2) ?? '—'}</p>
            </div>
            <div style={{ background: '#1e1e1e', padding: '1rem', borderRadius: '8px' }}>
              <p style={{ marginBottom: '0.5rem', color: '#888' }}>Referral Rewards Given</p>
              <p style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>${referralEarnings?.toFixed(2) ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Transaction History Table or Empty State */}
        <div style={{ marginTop: '3rem', color: 'white' }}>
          <h2 style={{ color: '#00c36d', fontSize: '1.15rem', marginBottom: '1rem' }}>
            Transaction History
          </h2>
          {transactions && transactions.length > 0 ? (
            <div style={{ overflowX: 'auto', borderRadius: '12px', boxShadow: '0 2px 8px #0002', background: '#1e1e1e' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, color: '#eee', fontSize: '0.98rem' }}>
                <thead>
                  <tr style={{ background: '#222' }}>
                    <th style={{ padding: '0.7rem', textAlign: 'left', fontWeight: 700, letterSpacing: '0.01em', borderBottom: '2px solid #222' }}>Date</th>
                    <th style={{ padding: '0.7rem', textAlign: 'left', fontWeight: 700, borderBottom: '2px solid #222' }}>Client</th>
                    <th style={{ padding: '0.7rem', textAlign: 'right', fontWeight: 700, borderBottom: '2px solid #222' }}>Amount</th>
                    <th style={{ padding: '0.7rem', textAlign: 'right', fontWeight: 700, borderBottom: '2px solid #222' }}>Cashback Earned</th>
                    <th style={{ padding: '0.7rem', textAlign: 'right', fontWeight: 700, borderBottom: '2px solid #222' }}>Cashback Redeemed</th>
                    <th style={{ padding: '0.7rem', textAlign: 'right', fontWeight: 700, borderBottom: '2px solid #222' }}>Referral Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr
                      key={tx.id}
                      style={{
                        transition: 'background 0.2s',
                        cursor: 'pointer',
                        borderBottom: '1px solid #222'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#23272a'}
                      onMouseOut={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '0.6rem 0.7rem', textAlign: 'left' }}>
                        {new Date(tx.created_at).toLocaleDateString()}<br />
                        <span style={{ fontSize: '0.87em', color: '#aaa' }}>{new Date(tx.created_at).toLocaleTimeString()}</span>
                      </td>
                      <td style={{ padding: '0.6rem 0.7rem', textAlign: 'left' }}>
                        {tx.user?.first_name || ''} {tx.user?.last_name || ''}
                        {(!tx.user?.first_name && !tx.user?.last_name) && tx.user?.email
                          ? <span style={{ color: '#aaa' }}>{tx.user.email}</span>
                          : ''}
                      </td>
                      <td style={{ padding: '0.6rem 0.7rem', textAlign: 'right' }}>
                        ${Number(tx.amount ?? 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.6rem 0.7rem', textAlign: 'right' }}>
                        ${Number(tx.cashback_earned ?? 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.6rem 0.7rem', textAlign: 'right' }}>
                        ${Number(tx.cashback_used ?? 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.6rem 0.7rem', textAlign: 'right' }}>
                        ${Number(tx.referral_reward ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#aaa', textAlign: 'center', marginTop: '2rem' }}>
              No transactions found yet.
            </p>
          )}
        </div>

        <button
          onClick={logoutAndReload}
          style={{
            marginTop: '2.5rem',
            padding: '0.5rem 1.25rem',
            background: '#00c36d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Log out
        </button>
      </div>

      {/* Payment Demo Modal */}
      {showPaymentDemo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#121212',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowPaymentDemo(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '1.5rem',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
            <h2 style={{ color: 'white', marginBottom: '1rem' }}>Test Payment</h2>
            <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>
              This is a demo payment. Use test card number: 4242 4242 4242 4242
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                Amount ($)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                defaultValue="10.00"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: '#1a1a1a',
                  color: 'white',
                  border: '1px solid #444',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowPaymentDemo(false)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  background: '#00c36d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Process Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
