import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Image from 'next/image';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const checkRoleAndRedirect = async () => {
      try {
        // Wait for the session to be available
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus('error');
          setErrorMessage('Failed to get session');
          return;
        }

        if (!session) {
          // If no session, redirect to login
          router.replace('/user/login');
          return;
        }

        console.log('✅ User signed in:', session.user.id);
        
        // Check if user exists in businesses table
        const { data: businessCheck, error: businessError } = await supabase
          .from('businesses')
          .select('id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (businessError) {
          console.error('Business check error:', businessError);
        }

        if (businessCheck) {
          console.log('🏢 User is a business, redirecting to business dashboard');
          router.replace('/business/dashboard');
          return;
        }

        // Check if user has business role in metadata and create business record if needed
        if (session.user.user_metadata?.role === 'business') {
          const pendingName = localStorage.getItem('pending_business_name') || session.user.user_metadata?.business_name || 'Business';
          
          console.log('🏢 Creating business record for user with business role');
          
          // Create business record
          const { error: createError } = await supabase
            .from('businesses')
            .insert({
              id: session.user.id,
              email: session.user.email!,
              business_name: pendingName,
            });

          if (!createError) {
            localStorage.removeItem('pending_business_name');
            console.log('🏢 Business record created, redirecting to business dashboard');
            router.replace('/business/dashboard');
            return;
          } else {
            console.error('Failed to create business record:', createError);
          }
        }
        
        console.log('👤 Redirecting to user dashboard');
        router.replace('/user/dashboard');
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setErrorMessage('An unexpected error occurred');
      }
    };

    checkRoleAndRedirect();
  }, [router]);

  if (status === 'error') {
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
            {/* Error Icon */}
            <div className="mb-6">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
            </div>

            {/* Error Message */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1 font-sans">Authentication Error</h1>
              <p className="text-gray-600 text-sm font-sans">{errorMessage}</p>
            </div>

            {/* Retry Button */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <button 
                onClick={() => window.location.href = '/user/login'} 
                className="text-[#21431E] hover:text-[#1a3618] font-medium underline"
              >
                Return to login
              </button>
            </div>
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

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-140px)] px-4 -mt-24">
        <div className="max-w-sm w-full text-center">
          {/* Loading Animation */}
          <div className="mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#21431E] mx-auto mb-4"></div>
          </div>

          {/* Headline */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1 font-sans">Signing you in</h1>
            <p className="text-gray-600 text-sm font-sans">Please wait while we set up your account...</p>
          </div>

          {/* Help Text */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-700 text-sm">
              This may take a few moments. If you&apos;re not redirected automatically,{' '}
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