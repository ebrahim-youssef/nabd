import { describe, expect, it } from 'vitest'

import { DEFAULT_MODE, DEFAULT_THEME, VALID_MODES, VALID_THEMES } from '../appearance'

describe('appearance preferences', () => {
  it('keeps the parity defaults and valid values shared by both clients', () => {
    expect(DEFAULT_THEME).toBe('light')
    expect(DEFAULT_MODE).toBe('classic')
    expect(VALID_THEMES).toEqual(['light', 'dark'])
    expect(VALID_MODES).toEqual(['classic', 'modern'])
  })
})
