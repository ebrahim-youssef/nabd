import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const expoRouter = require('@expo/cli/build/src/start/server/metro/router') as {
  getRouterDirectoryModuleIdWithManifest: (projectRoot: string, expoConfig: object) => string
}

const projectRoot = resolve(__dirname, '../..')

describe('native Expo Router root', () => {
  it('resolves the real app directory and keeps the root layout available', () => {
    const expoConfig = JSON.parse(readFileSync(resolve(projectRoot, 'app.json'), 'utf8')).expo
    const routerDirectory = expoRouter.getRouterDirectoryModuleIdWithManifest(
      projectRoot,
      expoConfig,
    )

    expect(routerDirectory).toBe('app')
    expect(existsSync(resolve(projectRoot, 'app/_layout.tsx'))).toBe(true)
    const appEntries = readdirSync(resolve(projectRoot, 'app'), { recursive: true })
    expect(existsSync(resolve(projectRoot, 'app/__tests__'))).toBe(false)
    expect(appEntries.some((entry) => /\.test\.[^/]+$/.test(String(entry)))).toBe(false)
    expect(existsSync(resolve(projectRoot, 'src/app'))).toBe(false)
  })
})
