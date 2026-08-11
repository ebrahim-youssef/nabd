import { spawn } from 'node:child_process'

// `wrangler deploy --dry-run` validates the Wrangler configuration and the asset manifest without
// contacting Cloudflare, which is exactly the check we want in the build gate. It does that work in
// about a second and prints its success marker — then lingers before the process actually exits
// (wrangler 4.120.1: 22 minutes measured here, reproduced with a stripped environment, so it is
// teardown of some pending handle rather than anything we pass in). Running it directly makes the
// gate's duration depend on that teardown, which is not a wait a build gate should inherit.
//
// So the dry run is driven as a child process: success is the marker, failure is a non-zero exit
// or a marker that never arrives. Wrangler's own output is passed through untouched.
const SUCCESS_MARKER = '--dry-run: exiting now.'
const TIMEOUT_MS = 180_000

// `wrangler` resolves from PATH because package-script execution puts the workspace `.bin` on it.
const wrangler = spawn('wrangler', ['deploy', '--dry-run'], {
  stdio: ['ignore', 'pipe', 'pipe'],
})

let output = ''
let settled = false

function finish(code, message) {
  if (settled) return
  settled = true
  clearTimeout(timer)
  wrangler.kill('SIGTERM')
  if (message) process.stderr.write(`${message}\n`)
  process.exit(code)
}

const timer = setTimeout(() => {
  finish(
    1,
    `Wrangler dry run did not report success within ${TIMEOUT_MS / 1000}s. Output so far:\n${output}`,
  )
}, TIMEOUT_MS)

for (const stream of [wrangler.stdout, wrangler.stderr]) {
  stream.setEncoding('utf8')
  stream.on('data', (chunk) => {
    output += chunk
    process.stdout.write(chunk)
    if (output.includes(SUCCESS_MARKER)) finish(0)
  })
}

wrangler.on('error', (error) => finish(1, `Wrangler dry run could not start: ${error.message}`))

wrangler.on('exit', (code) => {
  if (code === 0 && !output.includes(SUCCESS_MARKER)) {
    finish(1, 'Wrangler dry run exited without reporting success.')
  }
  finish(code ?? 1, code === 0 ? undefined : `Wrangler dry run failed with exit code ${code}.`)
})
