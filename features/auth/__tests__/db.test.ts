import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCurrentUser, onUserChange, signInWithOAuth, signOut } from '../db'
import { AUTH_CALLBACK_PATH, AUTH_ERROR, OAUTH_PROVIDER } from '../constants'

// Fake Supabase auth surface — each method is a spy we configure per test.
const auth = {
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}

vi.mock('@/lib/db/supabase/client', () => ({
  createClient: () => ({ auth }),
}))

// The repository logs full detail on failure; silence it so failing-path tests stay quiet.
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('signInWithOAuth', () => {
  it('starts the flow with the configured provider and callback redirect', async () => {
    auth.signInWithOAuth.mockResolvedValue({ error: null })

    const result = await signInWithOAuth('https://nabd.app')

    expect(result).toEqual({ ok: true, value: undefined })
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: OAUTH_PROVIDER,
      options: { redirectTo: `https://nabd.app${AUTH_CALLBACK_PATH}` },
    })
  })

  it('returns the sign-in error code when Supabase reports an error', async () => {
    auth.signInWithOAuth.mockResolvedValue({ error: new Error('boom') })

    const result = await signInWithOAuth('https://nabd.app')

    expect(result).toEqual({ ok: false, error: AUTH_ERROR.signIn })
  })

  it('returns the sign-in error code when the call throws', async () => {
    auth.signInWithOAuth.mockRejectedValue(new Error('network'))

    const result = await signInWithOAuth('https://nabd.app')

    expect(result).toEqual({ ok: false, error: AUTH_ERROR.signIn })
  })
})

describe('signOut', () => {
  it('resolves ok when Supabase signs out cleanly', async () => {
    auth.signOut.mockResolvedValue({ error: null })

    expect(await signOut()).toEqual({ ok: true, value: undefined })
  })

  it('returns the sign-out error code on failure', async () => {
    auth.signOut.mockResolvedValue({ error: new Error('nope') })

    expect(await signOut()).toEqual({ ok: false, error: AUTH_ERROR.signOut })
  })
})

describe('getCurrentUser', () => {
  it('maps the Supabase user to the app AuthUser shape', async () => {
    auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.co', extra: 'ignored' } },
      error: null,
    })

    expect(await getCurrentUser()).toEqual({ id: 'u1', email: 'a@b.co' })
  })

  it('normalizes a missing email to null', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'u2' } }, error: null })

    expect(await getCurrentUser()).toEqual({ id: 'u2', email: null })
  })

  it('returns null when signed out', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    expect(await getCurrentUser()).toBeNull()
  })

  it('returns null (never throws) when the lookup errors', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('bad') })

    expect(await getCurrentUser()).toBeNull()
  })
})

describe('onUserChange', () => {
  it('emits the mapped user on sign-in events and returns an unsubscribe', () => {
    const unsubscribe = vi.fn()
    let handler: (event: string, session: unknown) => void = () => {}
    auth.onAuthStateChange.mockImplementation((cb: typeof handler) => {
      handler = cb
      return { data: { subscription: { unsubscribe } } }
    })

    const received: Array<{ id: string; email: string | null } | null> = []
    const cleanup = onUserChange((user) => received.push(user))

    handler('SIGNED_IN', { user: { id: 'u3', email: 'c@d.co' } })
    handler('SIGNED_OUT', null)

    expect(received).toEqual([{ id: 'u3', email: 'c@d.co' }, null])

    cleanup()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
