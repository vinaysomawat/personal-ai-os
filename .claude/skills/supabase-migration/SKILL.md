---
name: supabase-migration
description: Make a database schema change in vinay-ai-os (new table, new column, RLS policy) when there is no direct Postgres connection or Supabase CLI available — write a migration file, hand it to the user to run in the Supabase SQL Editor, then verify it actually applied via a direct PostgREST curl call. Use whenever a bug traces back to a missing table/column, or a new feature needs a schema change.
metadata:
  author: vinaysomawat
  version: "1.0.0"
---

# Supabase migration (no direct DB access)

This environment has no Postgres connection string and no Supabase CLI session — every schema change goes through a human-in-the-loop handoff: write the `.sql`, the user runs it manually, then verify independently. Never assume a migration applied just because you wrote the file or the user said "done" without checking — cheap to verify, expensive to debug a "missing table" bug that's actually a migration that silently failed or was never run.

## Steps

1. **Diagnose first, don't guess.** If a feature looks broken (e.g. "logging X doesn't update Y"), check whether the underlying table/column actually exists before assuming it's a caching or logic bug. Query PostgREST directly:
   ```
   curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/<table>?limit=1" \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
   ```
   A `PGRST205: Could not find the table 'public.<table>' in the schema cache` response confirms the table is genuinely missing — not a stale schema cache, not an RLS issue.

2. **Write the migration file** in `supabase/migrations/`, named `YYYYMMDD_description.sql` (append a letter suffix like `20260716b_...` for a same-day second migration). Follow this repo's standard shape (see CLAUDE.md's Database Tables section):
   - `user_id uuid references auth.users`
   - the 4 standard RLS policies (select/insert/update/delete scoped to `auth.uid()`), unless the table is deliberately shared/service-role-only
   - an index on any column you'll filter/sort by often (e.g. `date`, `user_id`)

   For an additive column change instead of a new table, use `alter table ... add column if not exists ...` so it's safe to re-run.

3. **Present the migration content to the user** and explicitly ask them to run it via the Supabase SQL Editor. Do not proceed as if it's applied — wait for their confirmation ("done", "done running query", etc.).

4. **Verify independently after they confirm** — re-run the same curl from step 1. Confirm you get real data (or an empty array) instead of a `PGRST205` error. Don't just trust the user's "done" — the whole point of this workflow is that neither of you has a direct DB connection to double-check any other way.

5. **Update `README.md`'s Database section** with the new table/column per CLAUDE.md's mandatory post-task checklist — this is not optional cleanup, it's the same tier as verifying the build.

## Gotchas

- A `PGRST205` error is the specific signal for "table genuinely doesn't exist" — don't confuse it with an RLS permission error (which returns different error shapes) or assume it's a client-side caching issue.
- Service-role key bypasses RLS — fine for this kind of diagnostic curl, but never use it as a substitute for testing actual user-scoped access.
- If a feature depends on the new schema (e.g. a server action that inserts into the new table), make sure that code path also has proper error handling (`if (error) throw new Error(error.message)`) — a silently-swallowed insert error into a missing table is exactly the kind of bug this workflow exists to catch early.
