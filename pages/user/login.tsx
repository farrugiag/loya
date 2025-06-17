import { useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Auth } from '@supabase/auth-ui-react'
import { useRouter } from 'next/router'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import useRoleGuard from '../../hooks/useRoleGuard'

export default function Login() {
  const { checking, blocked, logoutAndReload } = useRoleGuard('user')
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/callback?role=user')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  if (checking) {
    return (
      <div style={{ color: 'white', textAlign: 'center', marginTop: '3rem' }}>
        Checking session...
      </div>
    )
  }

  if (blocked) {
    return (
      <div style={{ padding: '2rem', color: 'white', textAlign: 'center' }}>
        <h2>⚠️ You're already signed in</h2>
        <p>
          You’re currently logged in as a <strong>business</strong>. Please log out before accessing the user login.
        </p>
        <button
          onClick={logoutAndReload}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#f87171',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Log out
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: '2rem' }}>
      <Auth
        supabaseClient={supabase}
        view="sign_in"
        providers={['google']}
        redirectTo="http://localhost:3000/callback?role=user"
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
        Don’t have an account?{' '}
        <a href="/user/signup" style={{ color: '#00c36d' }}>
          Sign up here
        </a>
      </p>
    </div>
  )
}
