import { readFile, readdir } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// A Tailwind v4 utility whose theme token does not exist emits **no CSS at all** — no error, no
// warning, and the element still renders, so component tests and even screenshots can pass while
// the styling is silently gone. `rounded-btn` and `shadow-card-sm` shipped that way: the real
// tokens are `--radius-button` and `--shadow-card-small`, so every primary button had square
// corners and every card lost its shadow.
//
// This scans the source for token-derived utilities and fails when the backing token is missing.

const SOURCE_ROOT = resolve(process.cwd(), 'src')
const SELF = resolve(process.cwd(), 'src/__tests__/design-tokens.test.ts')
const THEME_FILE = resolve(process.cwd(), 'src/generated-theme.css')
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx'])

// Utilities Tailwind ships itself, which need no project token.
const BUILT_IN = new Set([
  'rounded-full',
  'rounded-none',
  'shadow-none',
  'shadow-inner',
  'text-start',
  'text-end',
  'text-center',
  'text-left',
  'text-right',
])

// prefix in a class name -> the CSS custom-property namespace it resolves against
const NAMESPACES: ReadonlyArray<readonly [string, string]> = [
  ['rounded-', '--radius-'],
  ['shadow-', '--shadow-'],
]

// `rounded-` accepts a side or corner segment before the token — `rounded-t-card` and
// `rounded-s-card` both resolve against `--radius-card`, and there is no `--radius-t-card`. Strip a
// known segment so a legitimate per-side utility is not reported as a missing token. Only these
// exact segments are stripped, so a typo in the token itself still fails.
const RADIUS_SIDES = ['t', 'b', 's', 'e', 'l', 'r', 'ss', 'se', 'es', 'ee', 'tl', 'tr', 'bl', 'br']

function withoutRadiusSide(utility: string): string {
  if (!utility.startsWith('rounded-')) return utility
  const rest = utility.slice('rounded-'.length)
  const side = RADIUS_SIDES.find((candidate) => rest.startsWith(`${candidate}-`))
  return side ? `rounded-${rest.slice(side.length + 1)}` : utility
}

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return sourceFiles(path)
      // This file names the broken utilities in prose, so it must not scan itself.
      if (path === SELF) return []
      return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : []
    }),
  )
  return files.flat()
}

describe('design tokens', () => {
  it('backs every token-derived utility in the source with a real theme token', async () => {
    const theme = await readFile(THEME_FILE, 'utf8')
    const files = await sourceFiles(SOURCE_ROOT)

    const missing: string[] = []

    for (const file of files) {
      const contents = await readFile(file, 'utf8')
      // Class names as they appear in className strings, including variant prefixes.
      const candidates = contents.match(/[a-z-]*(?:rounded|shadow)-[a-z0-9-]+/g) ?? []

      for (const candidate of candidates) {
        // Strip variants such as `hover:` / `md:` — already excluded by the pattern — and any
        // leading fragment from a longer word.
        const matched = NAMESPACES.map(([prefix]) => {
          const index = candidate.indexOf(prefix)
          return index === -1 ? null : candidate.slice(index)
        }).find(Boolean)

        const utility = matched ? withoutRadiusSide(matched) : matched

        if (!utility || BUILT_IN.has(utility)) continue

        const namespace = NAMESPACES.find(([prefix]) => utility.startsWith(prefix))
        if (!namespace) continue

        const token = `${namespace[1]}${utility.slice(namespace[0].length)}`
        if (!theme.includes(`${token}:`)) {
          missing.push(`${file.replace(`${process.cwd()}/`, '')}: ${matched} (expected ${token})`)
        }
      }
    }

    expect(missing).toEqual([])
  })
})
