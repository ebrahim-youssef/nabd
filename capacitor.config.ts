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
  plugins: {
    // Edge-to-edge status bar (NBD-74): draw the WebView behind a transparent bar from the
    // first frame so there's no opaque system band, then NativeChrome tunes the icon style to
    // the active theme. `style: LIGHT` = dark icons for the default light theme.
    StatusBar: {
      overlaysWebView: true,
      style: 'LIGHT',
      backgroundColor: '#00000000',
    },
    // Cold-start splash (NBD-76): hold a branded teal screen over the WebView-boot gap so
    // there's no white flash. launchAutoHide:false lets JS hide it the moment the app mounts
    // (lib/impure/splash.ts); launchShowDuration is only a backstop if that hide never runs.
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 3000,
      backgroundColor: '#0e5a5a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
}

export default config
