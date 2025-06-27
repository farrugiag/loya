import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Image from 'next/image'
import Link from 'next/link'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (typeof window !== 'undefined') {
      localStorage.setItem('pending_first_name', firstName)
      localStorage.setItem('pending_last_name',  lastName)
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'http://localhost:3000/callback?role=user',
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`, // <- this fills in Display Name
        }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
    } else {
      setSuccess(true)
    }

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
      // Optional: Custom error message to avoid clutter
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
      <h2 style={{ textAlign: 'center', marginBottom: '1.25rem', fontSize: '1.25rem' }}>Sign Up</h2>

      <button onClick={() =>
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'http://localhost:3000/callback?role=user'
          }
        })
      } style={{
        backgroundColor: '#444',
        color: '#fff',
        padding: '0.5rem 1rem',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 400,
        marginBottom: '1rem',
        width: '100%',
        fontSize: '0.875rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem'
      }}>
        <Image src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google logo" width={16} height={16} />
        Continue with Google
      </button>

      <div style={{ width: '100%', textAlign: 'center', margin: '1rem 0', borderBottom: '1px solid #444', lineHeight: '0.1em' }}>
        <span style={{ background: '#000', padding: '0 10px', fontSize: '0.75rem', color: '#888' }}>or sign up with email</span>
      </div>

      {success ? (
        <>
          <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
            <p style={{ color: '#00c36d' }}>
              Account created! Please check your email to confirm and log in.
            </p>
            <p style={{ color: '#aaa', marginTop: '0.25rem' }}>
              If you don&apos;t see it, be sure to check your spam or junk folder.
            </p>
          </div>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.875rem' }}>
            Didn&apos;t get the email?{' '}
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
            <label htmlFor="firstName" style={{ fontSize: '0.875rem' }}>First Name</label>
            <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={{ padding: '0.5rem', backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #444', borderRadius: '4px', fontSize: '0.875rem', width: '100%' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="lastName" style={{ fontSize: '0.875rem' }}>Last Name</label>
            <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={{ padding: '0.5rem', backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #444', borderRadius: '4px', fontSize: '0.875rem', width: '100%' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="email" style={{ fontSize: '0.875rem' }}>Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '0.5rem', backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #444', borderRadius: '4px', fontSize: '0.875rem', width: '100%' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="password" style={{ fontSize: '0.875rem' }}>Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '0.5rem', backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #444', borderRadius: '4px', fontSize: '0.875rem', width: '100%' }} />
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
          Already have an account? <Link href="/user/login" style={{ color: '#00c36d' }}>Sign in</Link>
        </p>
      )}
    </div>
  )
}
