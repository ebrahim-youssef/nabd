import { readThemeWithFallback } from '../themeBootstrap'

describe('theme bootstrap', () => {
  it('returns the persisted theme when the preference read succeeds', async () => {
    await expect(readThemeWithFallback(async () => 'dark')).resolves.toBe('dark')
  })

  it('falls back to light and reports a read failure', async () => {
    const cause = new Error('sqlite unavailable')
    const onError = jest.fn()

    await expect(readThemeWithFallback(async () => {
      throw cause
    }, onError)).resolves.toBe('light')
    expect(onError).toHaveBeenCalledWith(cause)
  })
})
