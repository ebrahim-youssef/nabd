import { access, readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const distDirectory = fileURLToPath(new URL('../dist/', import.meta.url))
const requiredFiles = ['index.html', '_headers', 'robots.txt', 'sitemap.xml']
const forbiddenAssetPatterns = [/service-worker/i, /sw\.js$/i, /manifest\.webmanifest$/i]
const noindexDirective = 'X-Robots-Tag: noindex, nofollow'

function fail(message) {
  throw new Error(`Cloudflare build verification failed: ${message}`)
}

await Promise.all(requiredFiles.map((file) => access(new URL(file, `file://${distDirectory}`))))

const [html, headers, robots, sitemap, outputFiles] = await Promise.all([
  readFile(new URL('index.html', `file://${distDirectory}`), 'utf8'),
  readFile(new URL('_headers', `file://${distDirectory}`), 'utf8'),
  readFile(new URL('robots.txt', `file://${distDirectory}`), 'utf8'),
  readFile(new URL('sitemap.xml', `file://${distDirectory}`), 'utf8'),
  readdir(distDirectory, { recursive: true }),
])

const prePaintPosition = html.indexOf("localStorage.getItem('nabd:theme')")
const modulePosition = html.indexOf('<script type="module"')
if (prePaintPosition < 0 || modulePosition < 0 || prePaintPosition > modulePosition) {
  fail('the fixed appearance initializer must precede the built SPA module')
}

if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) {
  fail('the shared landing document must remain indexable')
}

// The indexing boundary is stated as noindex-everything plus one detach, because the SPA
// fallback serves arbitrary unmatched paths from the same document. Both halves have to hold:
// losing the global rule leaks soft-404 pages into the index, and losing the detach hides the
// landing page from it.
const headerRules = headers.split(/\r?\n\r?\n/).filter(Boolean)
const globalRule = headerRules.find((candidate) => candidate.startsWith('/*\n'))
if (!globalRule?.includes(noindexDirective)) {
  fail('the global /* rule is missing its HTTP noindex directive')
}
const landingRule = headerRules.find((candidate) => candidate.startsWith('/\n'))
if (!landingRule?.includes('! X-Robots-Tag')) {
  fail('the public landing route does not detach the noindex directive')
}
if (headerRules.filter((candidate) => candidate.includes('! X-Robots-Tag')).length !== 1) {
  fail('only the public landing route may detach the noindex directive')
}

if (!robots.includes('Disallow: /app/')) fail('robots.txt does not exclude /app/')
if (sitemap.includes('/app') || (sitemap.match(/<loc>/g) ?? []).length !== 1) {
  fail('sitemap.xml must contain only the public landing route')
}

const forbiddenAsset = outputFiles.find((file) =>
  forbiddenAssetPatterns.some((pattern) => pattern.test(file)),
)
if (forbiddenAsset) fail(`unexpected PWA asset emitted: ${forbiddenAsset}`)
if (/rel=["']manifest["']/i.test(html)) fail('the SPA must not advertise installability')

process.stdout.write('Cloudflare build artifact verification passed.\n')
