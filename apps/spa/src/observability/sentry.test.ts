import { afterEach, describe, expect, it, vi } from 'vitest'

const { initMock, captureMock } = vi.hoisted(() => ({
  initMock: vi.fn(),
  captureMock: vi.fn(),
}))

vi.mock('@sentry/react', () => ({
  init: initMock,
  captureException: captureMock,
}))

const TEST_DSN = 'https://public@example.invalid/1'

async function loadSentryModule() {
  vi.resetModules()
  const module = await import('./sentry')
  return module as typeof import('./sentry')
}

afterEach(() => {
  vi.unstubAllEnvs()
  initMock.mockClear()
  captureMock.mockClear()
})

describe('initializeSentry', () => {
  it('no-ops without a DSN and never reports or throws', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '')
    const { initializeSentry, captureException } = await loadSentryModule()

    expect(() => {
      initializeSentry()
      captureException(new Error('boom'))
    }).not.toThrow()

    expect(initMock).not.toHaveBeenCalled()
    expect(captureMock).not.toHaveBeenCalled()
  })

  it('trims the DSN and initialises exactly once', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', `   ${TEST_DSN}   `)
    const { initializeSentry } = await loadSentryModule()

    initializeSentry()
    initializeSentry()

    expect(initMock).toHaveBeenCalledTimes(1)
    expect(initMock).toHaveBeenCalledWith({ dsn: TEST_DSN, enabled: true })
  })

  it('reports through Sentry only once initialised', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', TEST_DSN)
    const { initializeSentry, captureException } = await loadSentryModule()

    const cause = new Error('boom')
    captureException(cause)
    expect(captureMock).not.toHaveBeenCalled()

    initializeSentry()
    captureException(cause)

    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(captureMock).toHaveBeenCalledWith(cause)
  })
})
