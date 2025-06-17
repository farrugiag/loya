import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

type Role = 'user' | 'business'

export default function useRoleGuard(expectedRole: Role) {
  // ✅ Always declared first
  const [checking, setChecking] = useState(true)
  const [blocked, setBlocked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setChecking(false)
        return
      }

      const table = expectedRole === 'business' ? 'businesses' : 'users'
      const { data: entry, error } = await supabase
        .from(table)
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle()

      const match = !!entry

      setBlocked(!match)
      setChecking(false)
    }

    checkRole()
  }, [expectedRole, router])

  const logoutAndReload = async () => {
    await supabase.auth.signOut()
    router.reload()
  }

  return {
    checking,
    blocked,
    logoutAndReload
  }
}
