import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/router'
import useRoleGuard from '../../hooks/useRoleGuard'
import Link from 'next/link'
import Image from 'next/image'

export default function BusinessLogin() {
  const router = useRouter()
  const { checking, blocked, logoutAndReload } = useRoleGuard('business')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect to callback after login
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push('/callback?role=business')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      setError('')
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
    } catch (error: any) {
      setError(error.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking session...</p>
        </div>
      </div>
    )
  }

  if (blocked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-8 text-center">
          <div className="mb-6">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Already signed in</h2>
            <p className="text-gray-600 mb-6">
              You're signed in as a <strong>user</strong>. Please log out first.
            </p>
            <button
              onClick={logoutAndReload}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Log out
            </button>
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
            <p className="text-gray-600 text-sm font-sans">Log in to your business account</p>
          </div>



          {/* Email/Password Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21431E] focus:border-transparent placeholder-gray-600 text-black"
                  placeholder="Enter your password"
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
              {loading ? 'Signing in...' : 'Continue'}
            </button>
          </form>

          {/* Sign up link */}
          <p className="text-center mt-4 text-sm text-gray-600">
            Don't have a business account?{' '}
            <Link href="/business/signup" className="text-[#21431E] hover:text-[#1a3618] font-medium">
              Sign up here
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
