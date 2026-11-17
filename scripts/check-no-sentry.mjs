import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const scannerPath = fileURLToPath(import.meta.url)
const sourceDirectories = ['app', 'src', 'modules', 'plugins', 'theme']
const sourceFiles = [
  'app.json',
  'babel.config.cjs',
  'global.css',
  'metro.config.cjs',
  'nativewind-env.d.ts',
  'tailwind.config.cjs',
  'tsconfig.json',
]
const findings = []

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (['.gradle', 'build', 'dist', 'node_modules'].includes(entry.name)) continue
      await scan(join(directory, entry.name))
      continue
    }

    const path = join(directory, entry.name)
    if (path === scannerPath) continue
    const source = await readFile(path, 'utf8')
    if (hasSentryReference(entry.name, source)) findings.push(relative(appRoot, path))
  }
}

function hasSentryReference(fileName, source) {
  return (
    fileName.toLowerCase().includes('sentry') ||
    source.includes('@sentry/') ||
    /\bSentry\b/.test(source)
  )
}

for (const directory of sourceDirectories) await scan(join(appRoot, directory))
for (const file of sourceFiles) {
  const path = join(appRoot, file)
  const source = await readFile(path, 'utf8')
  if (hasSentryReference(file, source)) findings.push(relative(appRoot, path))
}

if (findings.length > 0) {
  console.error('Native Sentry references found:')
  for (const finding of findings.sort()) console.error(`- ${finding}`)
  process.exit(1)
}
