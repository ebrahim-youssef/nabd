#!/usr/bin/env node
// Enforces the "tests ship with the code" rule (docs/workflow.md, ADR-0004):
// every feature `logic.ts` and `db.ts` must have a colocated test in the same
// feature's __tests__/ folder. Exits non-zero (with a report) if any is missing.
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const FEATURES_DIR = 'features'
const REQUIRED_MODULES = ['logic.ts', 'db.ts']
const TEST_SUFFIXES = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx']

function hasTestFor(base, testsDir) {
  if (!existsSync(testsDir)) return false
  const files = readdirSync(testsDir)
  return TEST_SUFFIXES.some((suffix) => files.includes(`${base}${suffix}`))
}

function main() {
  if (!existsSync(FEATURES_DIR)) {
    console.log('colocated-test-check: no features/ directory yet — nothing to check.')
    return
  }

  const missing = []
  for (const feature of readdirSync(FEATURES_DIR)) {
    const featureDir = join(FEATURES_DIR, feature)
    if (!statSync(featureDir).isDirectory()) continue
    const testsDir = join(featureDir, '__tests__')
    for (const mod of REQUIRED_MODULES) {
      const base = mod.replace(/\.ts$/, '')
      if (existsSync(join(featureDir, mod)) && !hasTestFor(base, testsDir)) {
        missing.push(`${featureDir}/${mod} → expected ${testsDir}/${base}.test.ts`)
      }
    }
  }

  if (missing.length > 0) {
    console.error('colocated-test-check FAILED — missing colocated tests:')
    for (const m of missing) console.error(`  - ${m}`)
    process.exit(1)
  }

  console.log('colocated-test-check: all feature logic.ts/db.ts have colocated tests.')
}

main()
