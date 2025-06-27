// pages/user/dashboard.tsx

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import useRoleGuard from '../../hooks/useRoleGuard';
import { User } from '@supabase/supabase-js';

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
  const { checking, blocked, logoutAndReload } = useRoleGuard('user');
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (checking || blocked) return;

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/user/login');
        return;
      }

      // Prevent business users from accessing this dashboard
      const { data: bizCheck } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (bizCheck) {
        logoutAndReload();
        return;
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
  }, [checking, blocked, router, logoutAndReload]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/user/login');
  };

  if (checking) return <p style={{ color: 'white', padding: '2rem' }}>Checking access…</p>;

  if (blocked) {
    return (
      <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>
        <h2>Access Denied</h2>
        <p>You are not authorized to access the user dashboard.</p>
        <button onClick={logoutAndReload} style={{ marginTop: '1rem', background: '#f87171', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
          Log out
        </button>
      </div>
    );
  }

  if (!user || loading) {
    return (
      <div style={{ padding: '2rem', color: 'white' }}>
        <h2>Loading your wallet...</h2>
        <div style={{ background: '#222', height: '60px', width: '100%', marginBottom: '1rem', borderRadius: '8px' }} />
        <div style={{ background: '#222', height: '20px', width: '100px', borderRadius: '4px' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', color: 'white' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Welcome, {user.email}</h1>

      {/* Wallets Carousel */}
      <div
        ref={scrollContainerRef}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          gap: '1rem',
          paddingBottom: '1rem',
        }}
      >
        {wallets.map(w => {
          const isEmptyPlaceholder = w.id === 'empty-wallet-placeholder';
          const isReferralOnly = w.balance === 0 && w.balance_from_referrals > 0;

          return (
            <div
              key={w.id}
              style={{
                width: '300px',
                minHeight: '160px',
                background: '#111',
                padding: '1.5rem',
                borderRadius: '8px',
                flexShrink: 0,
                scrollSnapAlign: 'start',
                overflow: 'hidden',
                opacity: isEmptyPlaceholder ? 0.6 : 1,
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                👜 {w.business_name}
              </h2>
              <p style={{ fontSize: '2rem', color: '#00c36d', margin: 0 }}>
                ${w.balance.toFixed(2)}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#00c36d', fontWeight: 'bold', marginTop: '0.25rem' }}>
                +${w.balance_from_referrals.toFixed(2)} from referrals
              </p>

              {isReferralOnly && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#aaa' }}>
                  🧠 This wallet was created because someone you referred made a purchase at this business!
                </p>
              )}

              {isEmptyPlaceholder && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#888' }}>
                  Your wallet will appear here once you make your first purchase!
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Transactions */}
      <h3 style={{ marginBottom: '1rem' }}>📋 Recent Transactions</h3>
      {transactions.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {transactions.map(txn => (
            <li key={txn.id} style={{ padding: '1rem 0', borderBottom: '1px solid #333' }}>
              <div style={{ fontWeight: 'bold' }}>{txn.business_name}</div>
              <div>Purchase: ${txn.amount.toFixed(2)}</div>
              <div>Cashback: ${txn.cashback_earned.toFixed(2)}</div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>
                {new Date(txn.created_at).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: '#aaa' }}>No transactions yet.</p>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          marginTop: '2rem',
          padding: '0.5rem 1rem',
          background: '#444',
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
