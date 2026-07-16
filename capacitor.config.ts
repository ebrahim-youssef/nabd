import type { CapacitorConfig } from '@capacitor/cli'

// Capacitor Android shell (NBD-46, ADR-0012): a remote-URL wrapper — the webview loads the
// production site, so every web deploy reaches the app instantly and the Serwist SW keeps it
// offline after first launch. webDir is a placeholder the CLI requires; it is never bundled.
// appId is PERMANENT once the app is on Google Play — confirm before the first upload.
const config: CapacitorConfig = {
  appId: 'com.nabd.app',
  appName: 'نبض',
  webDir: 'public',
  server: {
    url: 'https://nobd-frontend.vercel.app',
    cleartext: false,
  },
}

export default config
