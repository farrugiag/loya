import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

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
    <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>
      <h2>Reinitializing onboarding…</h2>
      <p>If you're not redirected automatically, <a onClick={() => router.reload()}>click here</a>.</p>
    </div>
  );
}
