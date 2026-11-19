import { isNavMatch } from '../navMatch'

const MORE_PATHS = [
  '/more',
  '/prayer-times',
  '/stats',
  '/qada',
  '/niyyat',
  '/libraries',
  '/settings',
  '/backup',
] as const

describe('isNavMatch', () => {
  it.each([
    ['/', ['/'], true],
    ['/today/2026-11-19', ['/today'], true],
    ['/adhkar/morning', ['/adhkar'], true],
  ] as const)('matches %s against %s', (pathname, match, expected) => {
    expect(isNavMatch(pathname, match, false)).toBe(expected)
  })

  it.each(MORE_PATHS)('matches the more tab at %s', (pathname) => {
    expect(isNavMatch(pathname, MORE_PATHS, false)).toBe(true)
  })

  it('matches the exact home path only when exact is enabled', () => {
    expect(isNavMatch('/', ['/'], true)).toBe(true)
    expect(isNavMatch('/today', ['/'], true)).toBe(false)
  })

  it('matches descendants for a non-exact path', () => {
    expect(isNavMatch('/adhkar/anything', ['/adhkar'], false)).toBe(true)
  })

  it.each([
    ['/today2', ['/today']],
    ['/unknown', ['/today', '/adhkar', '/more']],
  ] as const)('does not match %s against %s', (pathname, match) => {
    expect(isNavMatch(pathname, match, false)).toBe(false)
  })
})
