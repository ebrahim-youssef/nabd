# ADR-0013 — Bundled native WebView (static export in the APK)

- **Status:** accepted (owner decision 2026-07-19)
- **Date:** 2026-07-19

## Context

ADR-0012 §1 chose a remote-URL shell: the Android WebView loads the production Vercel site,
counting on the Serwist service worker for offline. In practice that promise does not hold —
the Capacitor maintainers state service workers "don't work well" in the WebView under
Capacitor (capacitor discussion #3205: remote-URL apps hang on splash/blank when cold-started
offline, even with a warm SW cache), and `server.url` is documented as a live-reload dev
feature, not a production mode. An offline-first app whose shell needs the network on every
cold start defeats its own point. The data layer is already offline-first (Dexie, ADR-0002);
the app shell was the only online dependency left.

## Decision

The APK bundles the whole app. `pnpm cap:sync` runs a second build flavor —
`NEXT_PUBLIC_BUILD_TARGET=native` → `output: 'export'` in `next.config.ts` — and copies the
`out/` directory into the Android project (`webDir: 'out'`, no `server` block). The WebView
boots from disk at origin `https://localhost`: offline from the first launch, no splash hang,
instant startup. The web deployment on Vercel stays server-rendered and byte-identical; the
flag only exists at native build time.

What the flavor changes:

- **Serwist is disabled in the native build** — every asset already ships in the APK, and a
  SW in the Capacitor WebView is the unreliability we are escaping. The web PWA keeps it.
- **Web-only chrome is compiled out** (`app/layout.tsx`): the SW update prompt and Vercel
  Analytics, which would post to a nonexistent endpoint from `https://localhost`.
- **Auth is fully client-side** (prerequisite shipped as NBD-55): the OAuth callback is a
  client page calling `exchangeCodeForSession` in the browser — the same code path on web and
  native — because a static export has no route handlers. `lib/db/supabase/server.ts` is
  gone; the proxy (`proxy.ts`) still refreshes web session cookies but is simply absent from
  the native bundle. On native, sign-in uses the system browser and returns via the
  `nabd://auth/callback` deep link (NBD-57).
- **No OTA service** (owner decision): a web deploy no longer reaches the installed app;
  every native release is a rebuilt APK (`docs/release-android.md`). Revisit (Capgo or
  Capawesome live updates) if release cadence makes rebuilds painful.

ADR-0012 §1 (remote-URL shell) is superseded by this ADR; its §2–§4 (alarm channels,
permissions, scope) stand unchanged.

Alternatives rejected: hardening the SW around the remote shell (maintainer-confirmed dead
end on Android, and WKWebView has no SW at all for a future iOS shell); OTA live updates
(infrastructure and review-policy surface the project doesn't need yet).

## Consequences

- Native features no longer wait for a web deploy — code and native shell ship together in
  the APK. The inverse of ADR-0012's consequence: web deploys no longer update the app.
- The WebView origin changed from `https://nobd-frontend.vercel.app` to `https://localhost`,
  orphaning Dexie/localStorage data written by pre-0013 installs (owner debug builds only —
  accepted, nothing is on Google Play yet).
- `nabd://auth/callback` must be registered as a redirect URL in the Supabase dashboard
  (manual, owner) before native sign-in works.
- Every release now runs the native gate too: `pnpm cap:sync` must produce a clean `out/`
  (a new route handler or server-only API in a page would break the export — CI's
  `build` job does not catch this; the release checklist does).
