import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const nativeRoot = fileURLToPath(new URL('../apps/native/', import.meta.url))
const excludedDirectories = new Set(['.gradle', 'build', 'dist', 'node_modules'])
const findings = []

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) await scan(join(directory, entry.name))
      continue
    }

    const path = join(directory, entry.name)
    const source = await readFile(path, 'utf8')
    if (
      entry.name.toLowerCase().includes('sentry') ||
      source.includes('@sentry/') ||
      /\bSentry\b/.test(source)
    ) {
      findings.push(relative(nativeRoot, path))
    }
  }
}

await scan(nativeRoot)

if (findings.length > 0) {
  console.error('Native Sentry references found:')
  for (const finding of findings.sort()) console.error(`- ${finding}`)
  process.exit(1)
}
