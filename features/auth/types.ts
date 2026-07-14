// The slice of the Supabase user the app actually needs. Kept small on purpose so UI and
// hooks never depend on the full Supabase `User` shape.
export type AuthUser = {
  id: string
  email: string | null
}
