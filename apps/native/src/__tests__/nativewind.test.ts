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
    const interopSource = readFileSync(
      require.resolve('react-native-css-interop/dist/runtime/components.js'),
      'utf8',
    )
    const registeredComponents = new Set(
      [
        ...interopSource.matchAll(
          /\(0,\s*api_1\.(?:cssInterop|remapProps)\)\(\s*(?:react_native_1\.)?([A-Z][\w]*)\s*,/g,
        ),
      ].map(([, component]) => component),
    )
    // Typography wrappers use JSX aliases for the same registered primitives.
    for (const alias of ['NativeText', 'NativeTextInput']) registeredComponents.add(alias)
    expect(registeredComponents.size).toBeGreaterThanOrEqual(12)
    for (const component of ['View', 'Text', 'TextInput']) {
      expect(registeredComponents).toContain(component)
    }
    const classNameComponents = [...source.matchAll(/<([A-Z][\w.]*)\b[^>]*\bclassName\s*=/g)].map(
      ([, component]) => component,
    )

    // Modal is the known unregistered component this guard catches.
    const unregisteredComponents = classNameComponents.filter(
      (component) => !registeredComponents.has(component),
    )
    if (unregisteredComponents.length > 0) {
      throw new Error(
        `NativeWind className guard found unregistered component(s): ${unregisteredComponents.join(', ')}`,
      )
    }
  })
})
