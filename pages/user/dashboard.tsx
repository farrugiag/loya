// pages/user/dashboard.tsx

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { User } from '@supabase/supabase-js';
import Image from 'next/image';

type Wallet = {
  id: string;
  balance: number;
  balance_from_referrals: number;
  business_name: string;
};

type Transaction = {
  id: string;
  amount: number;
  cashback_earned: number;
  created_at: string;
  business_name: string;
};

interface BusinessData {
  business_name: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/user/login');
        return;
      }



      // Check if user exists in users table, if not create them
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingUser) {
        // Create new user
        const userMeta = user.user_metadata;
        let first = localStorage.getItem('pending_first_name') || '';
        let last = localStorage.getItem('pending_last_name') || '';

        if (!first && userMeta.full_name) {
          const parts = userMeta.full_name.trim().split(' ');
          first = parts[0];
          last = parts.slice(1).join(' ') || '';
        }

        // Generate referral code
        const base = first.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || user.email!.split('@')[0];
        let code = base;
        let counter = 1;

        while (true) {
          const { count } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('referral_code', code);

          if (!count) break;
          counter++;
          code = `${base}${counter}`;
        }

        await supabase.from('users').upsert({
          id: user.id,
          email: user.email!,
          first_name: first,
          last_name: last,
          referral_code: code,
        }, { onConflict: 'id' });

        localStorage.removeItem('pending_first_name');
        localStorage.removeItem('pending_last_name');
      }

      setUser(user);

      const { data: walletData } = await supabase
        .from('wallets')
        .select('id, balance, balance_from_referrals, business_id, businesses(business_name)')
        .eq('user_id', user.id);

      const { data: transactionData } = await supabase
        .from('transactions')
        .select('id, amount, cashback_earned, created_at, business_id, businesses(business_name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const formattedWallets: Wallet[] = (walletData && walletData.length > 0
        ? walletData
        : [{ 
            id: 'empty-wallet-placeholder', 
            balance: 0, 
            balance_from_referrals: 0, 
            business_id: '', 
            businesses: { business_name: 'Your Wallet' } 
          }]
      ).map(w => ({
        id: w.id,
        balance: w.balance,
        balance_from_referrals: w.balance_from_referrals,
        business_name: (w.businesses as unknown as BusinessData)?.business_name ?? 'Unknown Store'
      }));

      const formattedTransactions: Transaction[] = (transactionData ?? []).map(t => ({
        id: t.id,
        amount: t.amount,
        cashback_earned: t.cashback_earned,
        created_at: t.created_at,
        business_name: (t.businesses as unknown as BusinessData)?.business_name ?? 'Unknown Store'
      }));

      setWallets(formattedWallets);
      setTransactions(formattedTransactions);
      setLoading(false);

      formattedWallets.forEach(w => {
        const isReferralOnly = w.balance === 0 && w.balance_from_referrals > 0;
        const notifiedKey = `referral-notified-${w.id}`;
        if (isReferralOnly && !localStorage.getItem(notifiedKey)) {
          alert(`🎉 You've earned $${w.balance_from_referrals.toFixed(2)} from a friend at ${w.business_name}!`);
          localStorage.setItem(notifiedKey, 'true');
        }
      });
    };

    fetchData();

    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      window.history.replaceState({}, document.title, '/user/dashboard');
    }
  }, [router]);

  const handleLogout = async () => {
    setSigningOut(true);
    console.log('🚪 Dashboard logout requested');
    try {
      // Fast logout: just sign out and redirect
      await supabase.auth.signOut();
      router.replace('/user/login');
    } catch (error) {
      console.error('❌ Dashboard logout failed:', error);
      // Fallback: force redirect
      router.push('/user/login');
    } finally {
      setSigningOut(false);
    }
  };

  const scrollWallets = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 340; // card width + gap
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const newScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  // Simple loading state while fetching data
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21431E] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
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
        {/* Wallets Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Wallets</h2>
          
          {/* Wallet Navigation Container */}
          <div className="relative">
            {/* Left Arrow */}
            {wallets.length > 1 && (
              <button
                onClick={() => scrollWallets('left')}
                className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Right Arrow */}
            {wallets.length > 1 && (
              <button
                onClick={() => scrollWallets('right')}
                className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Wallet Cards Container */}
            <div
              ref={scrollContainerRef}
              className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {wallets.map(w => {
                const isEmptyPlaceholder = w.id === 'empty-wallet-placeholder';
                const isReferralOnly = w.balance === 0 && w.balance_from_referrals > 0;

                return (
                  <div
                    key={w.id}
                    className={`min-w-[320px] max-w-[320px] bg-white border border-gray-200 rounded-lg p-6 flex-shrink-0 ${
                      isEmptyPlaceholder ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-900 truncate">
                        {w.business_name}
                      </h3>
                      <span className="text-2xl">👜</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600">Available Balance</p>
                        <p className="text-2xl font-bold text-[#21431E]">
                          ${w.balance.toFixed(2)}
                        </p>
                      </div>
                      
                      {w.balance_from_referrals > 0 && (
                        <div>
                          <p className="text-sm text-gray-600">From Referrals</p>
                          <p className="text-lg font-semibold text-green-600">
                            +${w.balance_from_referrals.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>

                    {isReferralOnly && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-700">
                          🧠 This wallet was created because someone you referred made a purchase at this business!
                        </p>
                      </div>
                    )}

                    {isEmptyPlaceholder && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">
                          Your wallet will appear here once you make your first purchase!
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Transactions Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h2>
          {transactions.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {transactions.map((txn, index) => (
                <div
                  key={txn.id}
                  className={`flex items-center justify-between p-4 ${
                    index !== transactions.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-[#21431E] rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-medium">$</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{txn.business_name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(txn.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">-${txn.amount.toFixed(2)}</p>
                    <p className="text-sm text-green-600 font-medium">
                      +${txn.cashback_earned.toFixed(2)} cashback
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-600">
                Your transaction history will appear here once you make your first purchase.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
