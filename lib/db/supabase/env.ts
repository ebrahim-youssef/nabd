// Public Supabase configuration, read once and validated at import time.
//
// NEXT_PUBLIC_* vars are inlined into the browser bundle by Next at build time, so they must
// be referenced by their literal names here — never through a dynamic `process.env[key]`
// lookup, which Next cannot statically replace.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example).',
  )
}

export const supabaseUrl = url
export const supabaseAnonKey = anonKey
