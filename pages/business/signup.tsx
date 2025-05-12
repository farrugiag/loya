import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function BusinessSignUp() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // store the business name so the callback page can insert it
    if (typeof window !== 'undefined') {
      localStorage.setItem('pending_business_name', businessName)
    }


    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'http://localhost:3000/callback?role=business',
        data: {
          role: 'business',
          business_name: businessName, // optional: store in metadata
          full_name: businessName
        }
      }
    })
    

    if (signUpError || !authData.user) {
      setError(signUpError?.message || 'Signup failed')
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
  }

  const handleResendConfirmation = async () => {
    if (!email || resendCooldown) return

    setResendCooldown(true)
    setCooldownSeconds(60)
    setLoading(true)

    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email })
    setLoading(false)

    if (resendError) {
      setError("Please wait a full minute before resending.")
    } else {
      alert('Confirmation email resent!')
    }

    const countdown = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(countdown)
          setResendCooldown(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: '2rem', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.25rem', fontSize: '1.25rem' }}>Business Sign Up</h2>

      {success ? (
        <>
          <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
            <p style={{ color: '#00c36d' }}>
              Account created! Please check your email to confirm and log in.
            </p>
            <p style={{ color: '#aaa', marginTop: '0.25rem' }}>
              If you don’t see it, be sure to check your spam or junk folder.
            </p>
          </div>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.875rem' }}>
            Didn’t get the email?{' '}
            <a
              href="#"
              onClick={handleResendConfirmation}
              style={{
                color: resendCooldown ? '#888' : '#00c36d',
                pointerEvents: resendCooldown ? 'none' : 'auto',
                textDecoration: 'underline',
                fontWeight: 500
              }}
            >
              {resendCooldown ? `Resend available in ${cooldownSeconds}s` : 'Resend confirmation'}
            </a>
          </p>
        </>
      ) : (
        <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="businessName" style={{ fontSize: '0.875rem' }}>Business Name</label>
            <input id="businessName" type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required style={{ padding: '0.5rem', backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #444', borderRadius: '4px', fontSize: '0.875rem' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="email" style={{ fontSize: '0.875rem' }}>Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '0.5rem', backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #444', borderRadius: '4px', fontSize: '0.875rem' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="password" style={{ fontSize: '0.875rem' }}>Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '0.5rem', backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #444', borderRadius: '4px', fontSize: '0.875rem' }} />
          </div>

          <button type="submit" disabled={loading} style={{ marginTop: 10, padding: '0.5rem', backgroundColor: '#00c36d', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
      )}

      {error && !resendCooldown && (
        <p style={{ color: 'red', marginTop: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>
          {error}
        </p>
      )}

      {!success && (
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.875rem' }}>
          Already have a business account with Loya? <a href="/business/login" style={{ color: '#00c36d' }}>Sign in</a>
        </p>
      )}
    </div>
  )
}
