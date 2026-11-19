const fs = require('node:fs')
const path = require('node:path')

const fontPaths = require('../theme/fonts.cjs')
const MINIMUM_FONT_SIZE_BYTES = 1024
const INSTRUCTION =
  'Copy the licensed Thmanyah OTF files into assets/fonts/thmanyah/ (see DESIGN_SYSTEM.md). They are not in the repository by license.'

function getInvalidFontFiles(paths, fileSizes) {
  return paths.filter(
    (fontPath) => fileSizes[fontPath] == null || fileSizes[fontPath] < MINIMUM_FONT_SIZE_BYTES,
  )
}

function main() {
  const fileSizes = Object.fromEntries(
    fontPaths.map((fontPath) => {
      const absolutePath = path.resolve(__dirname, '..', fontPath)
      try {
        return [fontPath, fs.statSync(absolutePath).size]
      } catch {
        return [fontPath, undefined]
      }
    }),
  )
  const invalidFiles = getInvalidFontFiles(fontPaths, fileSizes)
  if (invalidFiles.length === 0) return

  for (const fontPath of invalidFiles) {
    process.stderr.write(`${fontPath} is missing, empty, or smaller than 1 KB.\n`)
  }
  process.stderr.write(`${INSTRUCTION}\n`)
  process.exitCode = 1
}

if (require.main === module) main()

module.exports = { getInvalidFontFiles }
