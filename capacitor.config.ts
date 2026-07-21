import type { CapacitorConfig } from '@capacitor/cli'

// Capacitor Android shell (ADR-0013): a bundled static export. `pnpm cap:sync` builds the app
// with `output: 'export'` into `out/` and copies it into the APK, so the WebView boots
// entirely from disk and the app works offline from the first launch. There is deliberately
// no `server` block — the remote-URL shell (ADR-0012 §1) is superseded; web deploys reach the
// app only through a new APK (owner decision: no OTA service).
// appId is PERMANENT once the app is on Google Play — confirm before the first upload.
const config: CapacitorConfig = {
  appId: 'com.nabd.app',
  appName: 'نبض',
  webDir: 'out',
}

export default config
