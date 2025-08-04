import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Image from 'next/image'

export default function Home() {
  const router = useRouter()

  // Show loading state while checking session
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          console.log('✅ User is signed in, redirecting to user dashboard')
          router.replace('/user/dashboard')
        }
      } catch (error) {
        console.error('❌ Error checking session on root:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkSession()
  }, [router])

  // Show loading state while checking session
  if (isChecking) {
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

        {/* Loading Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-140px)] px-4 -mt-24">
          <div className="max-w-sm w-full text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#21431E] mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1 font-sans">Welcome back!</h1>
            <p className="text-gray-600 text-sm font-sans">Redirecting you to your dashboard...</p>
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
            <p className="text-gray-600 text-sm font-sans">Welcome to Loya</p>
          </div>

          {/* Login Options */}
          <div className="space-y-3">
            <button 
              onClick={() => router.push('/user/login')}
              className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-900 font-medium">Continue as User</span>
            </button>
            
            <button 
              onClick={() => router.push('/business/login')}
              className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-900 font-medium">Continue as Business</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
