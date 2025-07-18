import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function Callback() {
  const router = useRouter()
  const { role } = router.query

  useEffect(() => {
    if (!router.isReady || typeof role !== 'string') return

    ;(async () => {
      const {
        data: { session },
        error: sessErr,
      } = await supabase.auth.getSession()

      if (sessErr || !session) {
        return router.replace(`/${role}/login`)
      }

      // ───── BUSINESS SIGNUP ─────
      if (role === 'business') {
        const pendingName = localStorage.getItem('pending_business_name') || ''
        const { error: bizErr } = await supabase
          .from('businesses')
          .upsert(
            {
              id: session.user.id,
              email: session.user.email!,
              business_name: pendingName,
            },
            { onConflict: 'id' }
          )

        if (bizErr) console.error('❌ Business upsert failed:', bizErr)
        else console.log('✅ Business created')

        localStorage.removeItem('pending_business_name')
        return router.replace('/business/dashboard')
      }

      // ───── SAFEGUARD: Prevent creating user if ID exists in businesses ─────
      const { data: bizCheck, error: bizCheckErr } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle()

      if (bizCheckErr) {
        console.error('❌ Error checking business existence:', bizCheckErr)
        return router.replace('/error') // Optional
      }

      if (bizCheck) {
        console.warn('⛔ User ID already exists as a business. Skipping user creation.')
        return router.replace('/business/dashboard')
      }

      // ───── USER SIGNUP ─────
      const userMeta = session.user.user_metadata
      let first = localStorage.getItem('pending_first_name') || ''
      let last = localStorage.getItem('pending_last_name') || ''

      if (!first && userMeta.full_name) {
        const parts = userMeta.full_name.trim().split(' ')
        first = parts[0]
        last = parts.slice(1).join(' ') || ''
      }

      const base = first.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || session.user.email!.split('@')[0]
      let code = base
      let counter = 1

      while (true) {
        const { count, error } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('referral_code', code)

        if (error || !count) break
        counter++
        code = `${base}${counter}`
      }

      const { error: userErr } = await supabase.from('users').upsert(
        {
          id: session.user.id,
          email: session.user.email!,
          first_name: first,
          last_name: last,
          referral_code: code,
        },
        { onConflict: 'id' }
      )

      if (userErr) console.error('❌ User upsert failed:', userErr)
      else console.log('✅ User created')

      localStorage.removeItem('pending_first_name')
      localStorage.removeItem('pending_last_name')

      router.replace('/user/dashboard')
    })()
  }, [router, role])

  return (
    <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>
      <h2>Finishing sign in…</h2>
      <p>
        If you’re not redirected soon,{' '}
        <a onClick={() => router.reload()}>reload</a>.
      </p>
    </div>
  )
}
