import { supabase } from '../../lib/supabaseClient'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useEffect } from 'react'
import useRoleGuard from '../../hooks/useRoleGuard'
import { useRouter } from 'next/router'

export default function BusinessLogin() {
  const router = useRouter()
  const { checking, blocked, logoutAndReload } = useRoleGuard('business')

  // Redirect to callback after login
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push('/callback?role=business')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  if (checking) return <p style={{ color: 'white' }}>Checking…</p>

  if (blocked) {
    return (
      <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
        <h2>Already signed in</h2>
        <p>You’re signed in as a <strong>user</strong>. Please log out first.</p>
        <button onClick={logoutAndReload}>Log out</button>
      </div>
    )
  }

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
    </div>
  )
}
