import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

describe('NativeWind registration guard', () => {
  it('never places className on an unregistered component', () => {
    const source = [
      ...sourceFiles(join(__dirname, '..')),
      ...sourceFiles(join(__dirname, '..', '..', 'app')),
    ]
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n')
    const registeredComponents = new Set([
      'Pressable',
      'SafeAreaView',
      'ScrollView',
      'Text',
      'View',
    ])
    const classNameComponents = [...source.matchAll(/<([A-Z][\w.]*)\b[^>]*\bclassName\s*=/g)].map(
      ([, component]) => component,
    )

    expect(classNameComponents.filter((component) => !registeredComponents.has(component))).toEqual(
      [],
    )
  })
})
