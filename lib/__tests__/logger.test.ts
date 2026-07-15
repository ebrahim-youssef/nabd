import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as Sentry from '@sentry/nextjs'

import { logger } from '../logger'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  it('reports errors to Sentry with the original error and context', () => {
    const cause = new Error('boom')
    logger.error('sync failed', cause, { table: 'wird_entries' })

    expect(Sentry.captureException).toHaveBeenCalledWith(cause, {
      extra: { message: 'sync failed', table: 'wird_entries' },
    })
  })

  it('wraps a message-only error call in an Error so Sentry gets a stack', () => {
    logger.error('something broke')

    expect(Sentry.captureException).toHaveBeenCalledTimes(1)
    const [reported] = vi.mocked(Sentry.captureException).mock.calls[0]
    expect(reported).toBeInstanceOf(Error)
    expect((reported as Error).message).toBe('something broke')
  })

  it('does not report non-error levels to Sentry', () => {
    logger.info('all good')

    expect(Sentry.captureException).not.toHaveBeenCalled()
  })
})
