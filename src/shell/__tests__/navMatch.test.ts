import { isNavMatch } from '../navMatch'

describe('isNavMatch', () => {
  it.each([
    ['/libraries', ['/libraries'], true],
    ['/libraries/child', ['/libraries'], true],
    ['/adhkar', ['/libraries', '/adhkar', '/niyyat'], true],
    ['/niyyat', ['/libraries', '/adhkar', '/niyyat'], true],
    ['/prayer-times', ['/prayer-times'], true],
    ['/stats', ['/stats', '/qada'], true],
    ['/qada', ['/stats', '/qada'], true],
    ['/settings', ['/settings'], true],
  ] as const)('matches %s against %s', (pathname, match, expected) => {
    expect(isNavMatch(pathname, match, false)).toBe(expected)
  })

  it('matches the exact home path only when exact is enabled', () => {
    expect(isNavMatch('/', ['/'], true)).toBe(true)
    expect(isNavMatch('/stats', ['/'], true)).toBe(false)
  })

  it('matches descendants for a non-exact path', () => {
    expect(isNavMatch('/libraries/anything', ['/libraries'], false)).toBe(true)
  })

  it.each([
    ['/libraries2', ['/libraries']],
    ['/unknown', ['/libraries', '/prayer-times', '/stats', '/settings']],
  ] as const)('does not match %s against %s', (pathname, match) => {
    expect(isNavMatch(pathname, match, false)).toBe(false)
  })
})
