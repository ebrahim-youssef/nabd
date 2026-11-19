import { resolveSystemPath } from '../deepLinks'

describe('resolveSystemPath', () => {
  it.each([
    ['nabd://home', '/'],
    ['/home', '/'],
    ['nabd://today/2026-11-19', '/today/2026-11-19'],
    ['/today/2026-11-19', '/today/2026-11-19'],
    ['nabd://today/not-a-day', '/today'],
    ['/today/2026-02-30', '/today'],
    ['nabd://adhkar/morning', '/adhkar/morning'],
    ['nabd://adhkar/morning/', '/adhkar/morning'],
    ['/adhkar/morning?source=widget', '/adhkar/morning?source=widget'],
    ['/adhkar/unknown', '/adhkar'],
    ['nabd://adhkar/', '/adhkar'],
    ['/today/2026-11-19/?source=widget', '/today/2026-11-19?source=widget'],
    ['nabd://today/2026-11-19/?source=widget', '/today/2026-11-19?source=widget'],
    ['/home/', '/'],
    ['/external/path?x=1', '/external/path?x=1'],
    ['https://example.test/path', 'https://example.test/path'],
  ])('resolves %s to %s', (path, expected) => {
    expect(resolveSystemPath(path)).toBe(expected)
  })
})
