import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import Image from 'next/image'

export default function BusinessSignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
          business_name: businessName,
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
                If you don&apos;t see it, be sure to check your spam or junk folder.
              </p>
            </div>

            <p className="text-center text-sm text-gray-600">
              Didn&apos;t get the email?{' '}
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
            <p className="text-gray-600 text-sm font-sans">Create your business account</p>
          </div>



          {/* Sign Up Form */}
          <form onSubmit={handleSignUp} className="space-y-3">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21431E] focus:border-transparent placeholder-gray-600 text-black"
                placeholder="Enter your business name"
                disabled={loading}
              />
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
              <p className="mt-1 text-sm text-gray-500">
                Use an organization email.
              </p>
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
            Already have a business account?{' '}
            <Link href="/business/login" className="text-[#21431E] hover:text-[#1a3618] font-medium">
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
