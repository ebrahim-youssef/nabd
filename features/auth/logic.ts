// Pure auth helpers (no I/O). See ADR-0002 / CONVENTIONS: logic.ts stays side-effect free.

// Resolves the post-login `next` target to a safe SAME-ORIGIN path. The OAuth callback reads
// `next` from an attacker-influenceable query string, so anything that is not a plain internal
// path collapses to the home route — this is what stops the callback from being turned into an
// open redirect (audit F2). Rejected: absolute URLs (`https://evil.com`), scheme-relative
// (`//evil.com`), backslash tricks the browser rewrites to `//` (`/\evil.com`, `/\\evil.com`),
// and anything not starting with a single `/`.
export function safeInternalPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/')) return '/'
  // Second char decides: `//` and `/\` both resolve to a foreign origin in the browser.
  const second = next[1]
  if (second === '/' || second === '\\') return '/'
  return next
}
