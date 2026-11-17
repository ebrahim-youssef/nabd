import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type ReleaseSigningPlugin = {
  _internals: {
    applyReleaseSigning: (buildGradle: string) => string
    findClosingBraceIndex: (source: string, openIndex: number) => number
  }
}

const plugin = require('../withNabdReleaseSigning.cjs') as ReleaseSigningPlugin
const template = readFileSync(join(__dirname, 'fixtures', 'app-build.gradle'), 'utf8')

function innerBlock(source: string, header: string): string {
  const start = source.indexOf(header)
  if (start === -1) throw new Error(`missing ${header}`)
  const open = source.indexOf('{', start)
  const close = plugin._internals.findClosingBraceIndex(source, open)
  if (close === -1) throw new Error(`unbalanced ${header}`)
  return source.slice(open + 1, close)
}

describe('withNabdReleaseSigning', () => {
  const output = plugin._internals.applyReleaseSigning(template)

  it('adds a release signing config inside signingConfigs', () => {
    const signingConfigs = innerBlock(output, 'signingConfigs {')

    expect(signingConfigs).toContain('// nabd:release-signing')
    expect(innerBlock(signingConfigs, 'release {')).toContain('new File(')
  })

  it('switches only release to the release signing config', () => {
    const buildTypes = innerBlock(output, 'buildTypes {')

    expect(innerBlock(buildTypes, 'release {')).toContain('signingConfig signingConfigs.release')
    expect(innerBlock(buildTypes, 'debug {')).toContain('signingConfig signingConfigs.debug')
    expect(output.match(/signingConfig signingConfigs\.release/g)).toHaveLength(1)
  })

  it('reads signing values at Gradle run time without writing secrets', () => {
    const releaseSigning = innerBlock(innerBlock(output, 'signingConfigs {'), 'release {')

    expect(releaseSigning).toContain('NABD_SIGNING_PROPERTIES')
    expect(releaseSigning).toContain('.keys/nabd/signing.properties')
    for (const key of ['storeFile', 'storePassword', 'keyAlias', 'keyPassword']) {
      expect(releaseSigning).toContain(`getProperty("${key}")`)
    }
    expect(releaseSigning).not.toMatch(/(storePassword|keyPassword)\s+['"][^'"]+['"](?:\s|$)/)
    expect(releaseSigning).not.toMatch(/storeFile file\(['"]/)
  })

  it('resolves relative keystore paths next to the signing properties file', () => {
    const releaseSigning = innerBlock(innerBlock(output, 'signingConfigs {'), 'release {')

    expect(releaseSigning).toContain('new File(nabdStoreFile)')
    expect(releaseSigning).toContain('nabdStoreFilePath.isAbsolute() ? nabdStoreFilePath : new File(nabdSigningFile.parentFile, nabdStoreFile)')
  })

  it('checks all four signing keys only for app release task graphs', () => {
    const check = output.slice(output.indexOf('// nabd:release-signing-check'))

    expect(check).toContain('gradle.taskGraph.whenReady')
    expect(check).toMatch(/nabdGraph\.allTasks\.find \{ it\.project\.path == ":app" && it\.name\.contains\("Release"\) \}/)
    expect(check).toContain('new File(')
    for (const key of ['storeFile', 'storePassword', 'keyAlias', 'keyPassword']) {
      expect(check).toContain(`"${key}"`)
    }
  })

  it('does not require signing for release tasks outside the app module', () => {
    const check = output.slice(output.indexOf('// nabd:release-signing-check'))

    expect(check).toMatch(/allTasks\.find \{ it\.project\.path == ":app" && it\.name\.contains\("Release"\) \}/)
  })

  it('is unchanged when release signing is applied twice', () => {
    expect(plugin._internals.applyReleaseSigning(output)).toBe(output)
  })

  it('names the signingConfigs anchor when it is missing', () => {
    expect(() => plugin._internals.applyReleaseSigning(template.replace('signingConfigs {', 'signing {')))
      .toThrow(/signingConfigs/)
  })

  it('names the buildTypes anchor when it is missing', () => {
    expect(() => plugin._internals.applyReleaseSigning(template.replace('buildTypes {', 'types {')))
      .toThrow(/buildTypes/)
  })

  it('names the release build type anchor when it is missing', () => {
    expect(() => plugin._internals.applyReleaseSigning(template.replace('        release {', '        publish {')))
      .toThrow(/release/)
  })

  it('names the release debug signing line anchor when it is missing', () => {
    const withoutReleaseDebugSigning = template.replace(
      /(release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.unset',
    )

    expect(() => plugin._internals.applyReleaseSigning(withoutReleaseDebugSigning)).toThrow(/signingConfig signingConfigs\.debug/)
  })
})
