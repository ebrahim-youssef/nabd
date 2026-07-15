// Single source of new row ids. UUIDs are generated client-side so a row created offline has
// its permanent id immediately and syncs to Supabase (uuid primary key) without remapping.
export function newId(): string {
  return crypto.randomUUID()
}
