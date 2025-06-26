import { renderHook, waitFor } from '@testing-library/react'
import useRoleGuard from '../hooks/useRoleGuard'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

jest.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}))

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

const mockedSupabase = supabase as unknown as {
  auth: {
    getSession: jest.Mock
    signOut: jest.Mock
  }
  from: jest.Mock
}

const mockedUseRouter = useRouter as jest.Mock

describe('useRoleGuard', () => {
  const reload = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseRouter.mockReturnValue({ reload })
  })

  it('checking transitions to false when no session exists', async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })

    const { result } = renderHook(() => useRoleGuard('user'))

    await waitFor(() => result.current.checking === false)

    expect(result.current.checking).toBe(false)
    expect(result.current.blocked).toBe(false)
    expect(mockedSupabase.from).not.toHaveBeenCalled()
  })

  it("blocked becomes true when the user's role does not match expectedRole", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: '1' } } },
    })

    const queryMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
    mockedSupabase.from.mockReturnValue(queryMock)

    const { result } = renderHook(() => useRoleGuard('business'))

    await waitFor(() => result.current.blocked === true)
  })
})
