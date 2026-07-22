import { describe, expect, it } from 'vitest'

import { safeInternalPath } from '../logic'

describe('safeInternalPath', () => {
  it('passes through plain internal paths', () => {
    expect(safeInternalPath('/')).toBe('/')
    expect(safeInternalPath('/settings')).toBe('/settings')
    expect(safeInternalPath('/stats?tab=week')).toBe('/stats?tab=week')
    expect(safeInternalPath('/a/b/c')).toBe('/a/b/c')
  })

  it('falls back to home when the target is missing', () => {
    expect(safeInternalPath(null)).toBe('/')
    expect(safeInternalPath(undefined)).toBe('/')
    expect(safeInternalPath('')).toBe('/')
  })

  it('rejects scheme-relative and backslash open-redirect payloads', () => {
    expect(safeInternalPath('//evil.com')).toBe('/')
    expect(safeInternalPath('//evil.com/path')).toBe('/')
    expect(safeInternalPath('/\\evil.com')).toBe('/')
    expect(safeInternalPath('/\\\\evil.com')).toBe('/')
  })

  it('rejects absolute URLs and non-path schemes', () => {
    expect(safeInternalPath('https://evil.com')).toBe('/')
    expect(safeInternalPath('http://evil.com')).toBe('/')
    expect(safeInternalPath('javascript:alert(1)')).toBe('/')
    expect(safeInternalPath('mailto:x@y.z')).toBe('/')
    expect(safeInternalPath('settings')).toBe('/')
  })
})
