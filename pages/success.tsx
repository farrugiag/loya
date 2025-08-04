// pages/success.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';

export default function Success() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { session_id } = router.query;

    if (session_id) {
      // In a real app, you'd verify the session with Stripe
      // For now, we'll just show a success message
      setSession({ id: session_id });
      setLoading(false);
    }
  }, [router.query]);

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