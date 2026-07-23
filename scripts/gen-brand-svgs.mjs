// Derives the transparent adaptive-icon foreground (motif only, teal backdrop
// removed) from the single brand mark (public/icon.svg). A monochrome themed
// icon is intentionally NOT generated: the star's outline + pulse detail is
// built from stacked tonal shapes that collapse to a featureless blob when
// tinted to a single color, so the standard fg+bg adaptive icon is used for
// themed-icon mode too. Run via scripts/android-icons.sh.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(resolve(root, 'public/icon.svg'), 'utf8')

// The brand backdrop is the single full-canvas rect filled with the deep teal
// rgb(6,62,63). Drop it so the star + pulse motif renders on transparency.
const BACKDROP = /<path d="M 0 0 L 2048 0 L 2048 2048 L 0 2048 L 0 0 z"[^>]*><\/path>\s*/
const foreground = src.replace(BACKDROP, '')

mkdirSync(resolve(root, 'resources'), { recursive: true })
writeFileSync(resolve(root, 'resources/icon-foreground.svg'), foreground)
console.log('wrote resources/icon-foreground.svg')
