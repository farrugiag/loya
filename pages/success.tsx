// pages/success.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';

export default function Success() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { session_id } = router.query;

    if (session_id) {
      // In a real app, you'd verify the session with Stripe
      // For now, we'll just show a success message
      setSession({ id: session_id });
      
      // Fetch transaction data to show cashback
      fetchTransactionData(session_id as string);
    }
  }, [router.query]);

  const fetchTransactionData = async (sessionId: string) => {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

             // Fetch the most recent transaction for this user (since session ID and payment intent ID are different)
       let { data: transactionData, error } = await supabase
         .from('transactions')
         .select(`
           id,
           amount,
           cashback_earned,
           created_at,
           businesses(business_name)
         `)
         .eq('user_id', user.id)
         .order('created_at', { ascending: false })
         .limit(1)
         .maybeSingle();

              console.log('Most recent transaction for user:', transactionData);

       // Check if the transaction was created recently (within last 5 minutes)
       if (transactionData) {
         const transactionTime = new Date(transactionData.created_at);
         const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
         
         if (transactionTime < fiveMinutesAgo) {
           console.log('Transaction is too old, treating as not found');
           transactionData = null;
         }
       }

       if (error || !transactionData) {
        console.log('No transaction found yet, webhook may still be processing:', error);
        
        // Debug: Let's see what transactions exist for this user
        const { data: allUserTransactions } = await supabase
          .from('transactions')
          .select('id, order_id, stripe_payment_intent_id, amount, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        console.log('Recent transactions for user:', allUserTransactions);
        console.log('Looking for session ID:', sessionId);
        
        // Don't show error, just continue without transaction data
        setLoading(false);
        return;
      }

      console.log('Transaction data found:', transactionData);
      setTransaction(transactionData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching transaction:', err);
      setLoading(false);
    }
  };

  // Poll for transaction data if not found initially
  useEffect(() => {
    if (session?.id && !transaction && !loading) {
      let pollInterval: NodeJS.Timeout;
      let timeout: NodeJS.Timeout;
      
      const startPolling = () => {
        pollInterval = setInterval(async () => {
          await fetchTransactionData(session.id);
        }, 2000); // Check every 2 seconds

        // Stop polling after 30 seconds
        timeout = setTimeout(() => {
          if (pollInterval) {
            clearInterval(pollInterval);
          }
        }, 30000);
      };

      startPolling();

      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    }
  }, [session?.id, loading]); // Removed transaction from dependencies

  if (loading) {
    return (
      <div className="min-h-screen bg-white font-sans">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21431E] mx-auto"></div>
            <p className="mt-4 text-gray-600">Processing your payment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white font-sans">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/store')}
              className="bg-[#21431E] hover:bg-[#1a3618] text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Return to Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header with Logo */}
      <div className="flex items-center p-6 pt-0">
        <div className="flex items-center space-x-2">
          <Image 
            src="/loya-logo.svg" 
            alt="Loya" 
            width={128} 
            height={128}
            className="w-32 h-32"
          />
        </div>
      </div>

      {/* Success Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-140px)] px-4 -mt-24">
        <div className="max-w-md w-full text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="text-green-500 text-6xl mb-4">✅</div>
          </div>

          {/* Success Message */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 text-sm">
              Thank you for your purchase. Your order has been processed successfully.
            </p>
            
            {/* Cashback Information */}
            {console.log('Rendering cashback section, transaction:', transaction)}
            {transaction ? (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-green-600 text-lg mr-2">🎉</span>
                  <p className="text-green-800 font-semibold">Cashback Earned!</p>
                </div>
                <p className="text-green-700 text-sm mb-1">
                  You earned <span className="font-bold">${(transaction.cashback_earned || 0).toFixed(2)}</span> cashback
                </p>
                <p className="text-green-600 text-xs">
                  on your ${(transaction.amount || 0).toFixed(2)} purchase at {transaction.businesses?.business_name || 'this store'}
                </p>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-blue-600 text-lg mr-2">⏳</span>
                  <p className="text-blue-800 font-semibold">Processing Cashback</p>
                </div>
                <p className="text-blue-700 text-sm">
                  Your cashback is being processed and will appear in your wallet shortly.
                </p>
              </div>
            )}
            
            {session && (
              <p className="text-xs text-gray-500 mt-2">
                Session ID: {session.id}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/user/dashboard')}
              className="w-full bg-[#21431E] hover:bg-[#1a3618] text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              View Dashboard
            </button>
            
            <button
              onClick={() => router.push('/store')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Continue Shopping
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              You'll receive a confirmation email shortly. If you have any questions, 
              please contact the business directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 