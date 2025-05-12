// pages/business/login.tsx

import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function BusinessLogin() {
  const router = useRouter()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push('/business/dashboard')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: '2rem' }}>
      <Auth
        supabaseClient={supabase}
        view="sign_in"
        providers={[]}
        redirectTo="http://localhost:3000/callback?role=business"
        showLinks={false}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                inputText: '#ffffff',
                inputLabelText: '#aaaaaa',
                brand: '#00c36d',
                brandAccent: '#00a95c',
              },
            },
          },
        }}
        theme="dark"
      />
      <p style={{ textAlign: 'center', marginTop: 20 }}>
        Don’t have a business account?{' '}
        <a href="/business/signup" style={{ color: '#00c36d' }}>
          Sign up here
        </a>
      </p>
    </div>
  )
}
