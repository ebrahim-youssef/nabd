// Regenerates the Android launcher icons and splash screens from the single
// brand mark (public/icon.svg). Run after the brand mark changes; the output
// under android/app/src/main/res is committed.
//
//   node scripts/android-icons.mjs
//
// Fixes the default-Capacitor-template icon/splash: the launcher becomes the
// nabd khatam+pulse adaptive icon (deep-teal backdrop matching the favicon /
// PWA icon), and the splash becomes the centered motif on the brand teal.
//
// Deps: rsvg-convert (librsvg), magick (ImageMagick), node. Also runs
// gen-brand-svgs.mjs first to derive the transparent foreground layer.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const res = join(root, 'android/app/src/main/res')
const iconSvg = join(root, 'public/icon.svg') // full composition (teal + motif)
const BRAND_BG = '#063E3F' // deep teal — adaptive-icon backdrop
const SPLASH_BG = '#0e5a5a' // brand teal — matches SplashScreen config

const tmp = mkdtempSync(join(tmpdir(), 'nabd-icons-'))
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'] })
const svg = (src, px, out) =>
  run('rsvg-convert', ['-w', String(px), '-h', String(px), src, '-o', out])

try {
  // 1. Derive the transparent foreground (motif only) from the brand mark.
  run('node', [join(root, 'scripts/gen-brand-svgs.mjs')])
  const fgSvg = join(root, 'resources/icon-foreground.svg')

  // 2. Adaptive-icon backdrop color.
  writeFileSync(
    join(res, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BRAND_BG}</color>\n</resources>\n`,
  )

  // 3. Per-density launcher icons. Adaptive foreground canvas is 108dp; the
  //    legacy square / round icons are 48dp.
  const FG_PX = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 }
  const SQ_PX = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }

  for (const d of Object.keys(FG_PX)) {
    const dir = join(res, `mipmap-${d}`)
    const fg = FG_PX[d]
    const sq = SQ_PX[d]

    // Adaptive foreground — motif on transparency; system draws the backdrop.
    svg(fgSvg, fg, join(dir, 'ic_launcher_foreground.png'))

    // Legacy square launcher — full teal+motif composition.
    svg(iconSvg, sq, join(dir, 'ic_launcher.png'))

    // Legacy round launcher — same composition, circle-masked.
    const full = join(tmp, `full-${sq}.png`)
    const mask = join(tmp, `mask-${sq}.png`)
    svg(iconSvg, sq, full)
    const r = Math.floor(sq / 2)
    run('magick', [
      '-size',
      `${sq}x${sq}`,
      'xc:none',
      '-fill',
      'white',
      '-draw',
      `circle ${r},${r} ${r},0`,
      mask,
    ])
    run('magick', [
      full,
      mask,
      '-alpha',
      'set',
      '-compose',
      'DstIn',
      '-composite',
      join(dir, 'ic_launcher_round.png'),
    ])
  }

  // 4. Splash screens — centered motif on the brand teal, one per existing
  //    file (keeps each density's dimensions). Motif spans ~36% of short edge.
  const splashDirs = readdirSync(res).filter(
    (n) => n.includes('drawable') && readdirSync(join(res, n)).includes('splash.png'),
  )
  for (const dir of splashDirs) {
    const splash = join(res, dir, 'splash.png')
    const [w, h] = execFileSync('magick', ['identify', '-format', '%w %h', splash])
      .toString()
      .split(' ')
      .map(Number)
    const motifPx = Math.floor(Math.min(w, h) * 0.36)
    const motif = join(tmp, 'motif.png')
    svg(fgSvg, motifPx, motif)
    run('magick', [
      '-size',
      `${w}x${h}`,
      `xc:${SPLASH_BG}`,
      motif,
      '-gravity',
      'center',
      '-composite',
      splash,
    ])
  }

  console.log('Android launcher icons + splash regenerated from public/icon.svg')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
