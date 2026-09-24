import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DEVICE_SOURCE_DIRECTORY = join(__dirname, '..')
const TEST_DIRECTORY = join(__dirname, '__tests__')
const NETWORK_CLIENT_MODULES = new Set([
  'axios',
  'got',
  'ky',
  'node-fetch',
  'superagent',
  'undici',
  'whatwg-fetch',
])
const IMPORT_PATTERN = /\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g
const GLOBAL_NETWORK_API_PATTERN = /(?<!\.)\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

function nonTestSourceFiles(): string[] {
  return sourceFiles(DEVICE_SOURCE_DIRECTORY).filter((path) => !path.startsWith(TEST_DIRECTORY))
}

describe('device privacy boundary', () => {
  it('does not import an HTTP network client from device source', () => {
    const importedNetworkClients = nonTestSourceFiles()
      .flatMap((path) => [...readFileSync(path, 'utf8').matchAll(IMPORT_PATTERN)])
      .map(([, moduleName]) => moduleName)
      .filter((moduleName) => NETWORK_CLIENT_MODULES.has(moduleName))

    expect(importedNetworkClients).toEqual([])
  })

  it('does not call a global network client from device source', () => {
    const networkClientFiles = nonTestSourceFiles().filter((path) =>
      GLOBAL_NETWORK_API_PATTERN.test(readFileSync(path, 'utf8')),
    )

    expect(networkClientFiles).toEqual([])
  })
})
