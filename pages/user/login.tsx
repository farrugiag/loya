import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function Login() {
  const router = useRouter()

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/user/dashboard')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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
                brandAccent: '#00a95c'
              }
            }
          }
        }}
        theme="dark"
      />
      <p style={{ textAlign: 'center', marginTop: 20 }}>
        Don’t have an account? <a href="/user/signup" style={{ color: '#00c36d' }}>Sign up here</a>
      </p>
    </div>
  )
}


//   return (
//     <div style={{ maxWidth: 400, margin: 'auto', padding: '2rem', color: 'white' }}>
//       <h2>Login</h2>
//       <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
//         <input
//           type="email"
//           placeholder="Email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           required
//           style={{ padding: '0.5rem' }}
//         />
//         <input
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           required
//           style={{ padding: '0.5rem' }}
//         />
//         <button type="submit" disabled={loading} style={{ padding: '0.5rem', background: '#00c36d', color: 'white', border: 'none' }}>
//           {loading ? 'Logging in...' : 'Login'}
//         </button>
//         {error && <p style={{ color: 'red' }}>{error}</p>}
//       </form>
//       <p style={{ textAlign: 'center', marginTop: 20 }}>
//         Don’t have an account? <a href="/signup">Sign up here</a>
//       </p>
//     </div>
//   )
// }

