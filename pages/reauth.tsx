import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';

export default function Reauth() {
  const router = useRouter();

  useEffect(() => {
    const reinitOnboarding = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session?.user) {
        return router.replace('/business/login');
      }

      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: session.user.id }),
      });

      const data = await res.json();
      if (res.ok && data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        console.error('Failed to regenerate onboarding link:', data.error);
      }
    };

    reinitOnboarding();
  }, [router]);

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

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-140px)] px-4 -mt-24">
        <div className="max-w-sm w-full text-center">
          {/* Loading Animation */}
          <div className="mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#21431E] mx-auto mb-4"></div>
          </div>

          {/* Headline */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1 font-sans">Reinitializing onboarding</h1>
            <p className="text-gray-600 text-sm font-sans">Please wait while we set up your Stripe account</p>
          </div>

          {/* Help Text */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-700 text-sm">
              If you&apos;re not redirected automatically,{' '}
              <button 
                onClick={() => router.reload()} 
                className="text-[#21431E] hover:text-[#1a3618] font-medium underline"
              >
                click here
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
