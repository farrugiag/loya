import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import Image from 'next/image';
import PaymentForm from '../../components/PaymentForm';

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
  const [signingOut, setSigningOut] = useState(false);
  const [transactionCount, setTransactionCount] = useState<number | null>(null);
  const [totalCashbackEarned, setTotalCashbackEarned] = useState<number | null>(null);
  const [totalCashbackUsed, setTotalCashbackUsed] = useState<number | null>(null);
  const [referralEarnings, setReferralEarnings] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showPaymentDemo, setShowPaymentDemo] = useState(false);

  useEffect(() => {
    const getSessionAndCheckStripe = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.replace('/business/login');
        return;
      }

      setUser(session.user);

      // Check if business exists in businesses table, if not create them
      const { data: existingBusiness } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!existingBusiness) {
        // Create new business
        const pendingName = localStorage.getItem('pending_business_name') || '';
        
        await supabase.from('businesses').upsert({
          id: session.user.id,
          email: session.user.email!,
          business_name: pendingName,
        }, { onConflict: 'id' });

        localStorage.removeItem('pending_business_name');
      }

      // Fetch business (assuming business_id is auth.uid())
      const business_id = session.user.id;

      // Fetch business Stripe status
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('stripe_id, stripe_details_submitted, stripe_charges_enabled, stripe_payouts_enabled')
        .eq('id', business_id)
        .single();

      if (bizError) {
        console.warn('Failed to fetch business:', bizError.message);
        setStripeConnected(false);
      } else {
        // Check if Stripe account exists and is fully set up
        const isStripeConnected = !!(
          business?.stripe_id && 
          business?.stripe_details_submitted && 
          business?.stripe_charges_enabled && 
          business?.stripe_payouts_enabled
        );
        setStripeConnected(isStripeConnected);
        
        // If we have a stripe_id but status is incomplete, try to refresh from Stripe API
        if (business?.stripe_id && !isStripeConnected) {
          try {
            const statusRes = await fetch(`/api/account-status?accountId=${business.stripe_id}`);
            if (statusRes.ok) {
              const status = await statusRes.json();
              if (status.details_submitted && status.charges_enabled && status.payouts_enabled) {
                // Update local database with current status
                await supabase
                  .from('businesses')
                  .update({
                    stripe_details_submitted: status.details_submitted,
                    stripe_charges_enabled: status.charges_enabled,
                    stripe_payouts_enabled: status.payouts_enabled
                  })
                  .eq('id', business_id);
                setStripeConnected(true);
              }
            }
          } catch (error) {
            console.warn('Failed to refresh Stripe status:', error);
          }
        }
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
  }, [router]);

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

  const handleLogout = async () => {
    setSigningOut(true);
    console.log('🚪 Business dashboard logout requested');
    try {
      // Fast logout: just sign out and redirect
      await supabase.auth.signOut();
      router.replace('/business/login');
    } catch (error) {
      console.error('❌ Business dashboard logout failed:', error);
      // Fallback: force redirect
      router.push('/business/login');
    } finally {
      setSigningOut(false);
    }
  };



  if (loading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header with Logo and User Info */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Image 
                src="/loya-logo.svg" 
                alt="Loya" 
                width={128} 
                height={128}
                className="w-32 h-16"
              />
              <div>
                <p className="text-sm text-gray-600">Welcome back, {user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={signingOut}
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {signingOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span>Signing out...</span>
                </>
              ) : (
                <span>Sign out</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stripe Connection Section */}
        {stripeConnected ? (
          <div className="mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="text-green-600 mr-3">✅</div>
                <div>
                  <p className="text-green-800 font-medium">Your Stripe account is connected</p>
                  <p className="text-green-700 text-sm">You can now accept payments and process cashback</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Stripe Management</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 text-sm mb-2">Access your Stripe Express Dashboard:</p>
                  <a
                    href="https://dashboard.stripe.com/test/express/acct_1Ronw2ELRkcaDPY5"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                    </svg>
                    Open Express Dashboard
                  </a>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-2">Test Payment (use test card):</p>
                  <p className="text-xs text-gray-500 mb-2">
                    <code className="bg-gray-100 px-2 py-1 rounded">4242 4242 4242 4242</code>
                  </p>
                  <button
                    onClick={() => setShowPaymentDemo(true)}
                    className="bg-[#21431E] hover:bg-[#1a3618] text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Demo Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-yellow-600 mr-3">⚠️</div>
                  <div>
                    <p className="text-yellow-800 font-medium">Stripe account not connected</p>
                    <p className="text-yellow-700 text-sm">Connect your Stripe account to start accepting payments</p>
                  </div>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="text-yellow-800 hover:text-yellow-900 px-3 py-1 text-sm border border-yellow-300 rounded hover:bg-yellow-100 transition-colors"
                >
                  Refresh Status
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={createStripeAccount}
                disabled={connectingStripe}
                className="w-full bg-[#21431E] hover:bg-[#1a3618] text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {connectingStripe ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Connecting to Stripe...</span>
                  </>
                ) : (
                  <span>Connect Stripe</span>
                )}
              </button>
              
              <p className="text-xs text-gray-500 text-center">
                If you've already completed Stripe onboarding, try refreshing the page or clicking "Refresh Status"
              </p>
            </div>
          </div>
        )}

        {/* Stats Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
              <p className="text-2xl font-bold text-[#21431E]">{transactionCount ?? '—'}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">Cashback Given to Users</p>
              <p className="text-2xl font-bold text-[#21431E]">${totalCashbackEarned?.toFixed(2) ?? '—'}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">Cashback Redeemed by Users</p>
              <p className="text-2xl font-bold text-[#21431E]">${totalCashbackUsed?.toFixed(2) ?? '—'}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">Referral Rewards Given</p>
              <p className="text-2xl font-bold text-[#21431E]">${referralEarnings?.toFixed(2) ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Transaction History Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h2>
          {transactions && transactions.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cashback Earned</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cashback Redeemed</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Referral Reward</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            {new Date(tx.created_at).toLocaleDateString()}
                            <div className="text-xs text-gray-500">
                              {new Date(tx.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tx.user?.first_name || ''} {tx.user?.last_name || ''}
                          {(!tx.user?.first_name && !tx.user?.last_name) && tx.user?.email && (
                            <div className="text-xs text-gray-500">{tx.user.email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ${Number(tx.amount ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                          ${Number(tx.cashback_earned ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ${Number(tx.cashback_used ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-medium">
                          ${Number(tx.referral_reward ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-600">
                Your transaction history will appear here once you start accepting payments.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Demo Modal */}
      {showPaymentDemo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Test Payment</h2>
              <button
                onClick={() => setShowPaymentDemo(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              This is a demo payment. Use test card number: <code className="bg-gray-100 px-2 py-1 rounded">4242 4242 4242 4242</code>
            </p>
            
            <PaymentForm
              amount={10.00}
              businessId={user.id}
              userId={user.id} // Using business ID as user ID for demo
              description="Demo payment test"
              onSuccess={(paymentIntentId) => {
                console.log('Payment successful:', paymentIntentId);
                alert('Payment successful! Check your Stripe dashboard.');
                setShowPaymentDemo(false);
              }}
              onError={(error) => {
                console.error('Payment failed:', error);
                alert(`Payment failed: ${error}`);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
