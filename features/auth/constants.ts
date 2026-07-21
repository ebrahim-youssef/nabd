import type { Provider } from '@supabase/supabase-js'

// ADR-0001 settles identity on Supabase Auth via OAuth. Google is the launch provider;
// switching or adding providers is a change here (plus the matching provider config in the
// Supabase dashboard), never scattered through the code.
export const OAUTH_PROVIDER: Provider = 'google'

// Where the OAuth provider redirects back to. The callback page exchanges the `code` query
// param for a session. Must be registered as a redirect URL in the Supabase dashboard.
export const AUTH_CALLBACK_PATH = '/auth/callback'

// Native (ADR-0013): the provider cannot redirect into the APK's https://localhost origin, so
// sign-in returns via this custom-scheme deep link instead (intent-filter in AndroidManifest,
// handled by NativeAuthListener). Must also be registered in the Supabase dashboard.
export const NATIVE_AUTH_CALLBACK = 'nabd://auth/callback'

// Where the callback page sends the user when the code exchange fails.
export const AUTH_ERROR_PATH = '/auth/auth-code-error'

// Short, stable error codes returned from the repository. The UI maps these to friendly
// copy; the real cause is already in the Logger.
export const AUTH_ERROR = {
  signIn: 'sign_in_failed',
  signOut: 'sign_out_failed',
  codeExchange: 'code_exchange_failed',
} as const
