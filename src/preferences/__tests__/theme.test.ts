import { DEFAULT_NATIVE_THEME, readStoredTheme } from '../theme'

describe('native theme preference', () => {
  it('defaults absent and invalid values to follow-phone system mode', () => {
    expect(DEFAULT_NATIVE_THEME).toBe('system')
    expect(readStoredTheme(null)).toBe('system')
    expect(readStoredTheme('modern')).toBe('system')
    expect(readStoredTheme('invalid')).toBe('system')
  })

  it.each(['light', 'dark', 'system'] as const)('accepts %s', (theme) => {
    expect(readStoredTheme(theme)).toBe(theme)
  })
})
