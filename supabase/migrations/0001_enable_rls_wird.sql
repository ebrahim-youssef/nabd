-- Row-Level Security for the synced wird tables (audit F1).
--
-- nabd has NO server tier: the browser and the Android WebView talk to Supabase directly with
-- the public anon key (features/sync/db.ts). The client sets `user_id` and the row `id` itself
-- and reads with a client-side `.eq('user_id', ...)` — none of which is a security boundary.
-- These policies are the ONLY thing isolating one user's devotional data from another's.
--
-- Rows are append-only/immutable (idempotent upsert by primary key), so there is no DELETE
-- policy — deletes are denied by default once RLS is enabled. UPDATE is allowed only for the
-- owner so an upsert that hits an existing id still succeeds for that user.
--
-- This migration version-controls the intended policy. It must be applied to the live project
-- and verified (`select relname, relrowsecurity from pg_class where relname in
-- ('wird_versions','wird_entries');` — both must be true) before it can be relied on.

alter table public.wird_versions enable row level security;
alter table public.wird_entries  enable row level security;

-- wird_versions -------------------------------------------------------------
drop policy if exists "wird_versions_select_own" on public.wird_versions;
create policy "wird_versions_select_own"
  on public.wird_versions for select
  using (auth.uid() = user_id);

drop policy if exists "wird_versions_insert_own" on public.wird_versions;
create policy "wird_versions_insert_own"
  on public.wird_versions for insert
  with check (auth.uid() = user_id);

drop policy if exists "wird_versions_update_own" on public.wird_versions;
create policy "wird_versions_update_own"
  on public.wird_versions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- wird_entries --------------------------------------------------------------
drop policy if exists "wird_entries_select_own" on public.wird_entries;
create policy "wird_entries_select_own"
  on public.wird_entries for select
  using (auth.uid() = user_id);

drop policy if exists "wird_entries_insert_own" on public.wird_entries;
create policy "wird_entries_insert_own"
  on public.wird_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "wird_entries_update_own" on public.wird_entries;
create policy "wird_entries_update_own"
  on public.wird_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
