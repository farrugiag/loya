import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Image from 'next/image'
import Link from 'next/link'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/callback?role=user'
        }
      })
      if (error) throw error
    } catch (error) {
      setError('Failed to sign up with Google')
      console.error('Google sign up error:', error)
    } finally {
      setLoading(false)
    }
  }

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
          full_name: `${firstName} ${lastName}`,
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

  if (success) {
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
          <div className="max-w-sm w-full">
            {/* Success Message */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1 font-sans">Check your email</h1>
              <p className="text-gray-600 text-sm font-sans">We've sent you a confirmation link</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 text-sm">
                Account created! Please check your email to confirm and log in.
              </p>
              <p className="text-green-700 text-xs mt-1">
                If you don't see it, be sure to check your spam or junk folder.
              </p>
            </div>

            <p className="text-center text-sm text-gray-600">
              Didn't get the email?{' '}
              <button
                onClick={handleResendConfirmation}
                disabled={resendCooldown}
                className="text-[#21431E] hover:text-[#1a3618] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCooldown ? `Resend available in ${cooldownSeconds}s` : 'Resend confirmation'}
              </button>
            </p>
          </div>
        </div>
      </div>
    )
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
        <div className="max-w-sm w-full">
          {/* Headline */}
          <div className="text-left mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1 font-sans">Better way to pay.</h1>
            <p className="text-gray-600 text-sm font-sans">Create your Loya account</p>
          </div>

          {/* Login Options */}
          <div className="space-y-2 mb-4">
            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-gray-900 font-medium">Continue with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Sign Up Form */}
          <form onSubmit={handleSignUp} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21431E] focus:border-transparent placeholder-gray-600 text-black"
                  placeholder="First name"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21431E] focus:border-transparent placeholder-gray-600 text-black"
                  placeholder="Last name"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21431E] focus:border-transparent placeholder-gray-600 text-black"
                placeholder="Enter your email address..."
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21431E] focus:border-transparent placeholder-gray-600 text-black"
                  placeholder="Create a password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#21431E] hover:bg-[#1a3618] text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          {/* Sign in link */}
          <p className="text-center mt-4 text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/user/login" className="text-[#21431E] hover:text-[#1a3618] font-medium">
              Sign in here
            </Link>
          </p>

          {/* Legal text */}
          <p className="text-center mt-6 text-xs text-gray-500">
            By continuing, you acknowledge that you understand and agree to the{' '}
            <a href="#" className="underline hover:text-gray-700">Terms & Conditions</a> and{' '}
            <a href="#" className="underline hover:text-gray-700">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
