/**
 * Seeds the v4.1 (2026 market) Question Bank rows into the global
 * coding_questions pool with the service client — re-runnable: a row is
 * matched on (category, title); missing rows are inserted, existing rows get
 * their answer_hints / body / url / sort_order / topics refreshed.
 *
 *   node --env-file=.env.local scripts/seed-prep-2026.mjs [backend|code-review|system-design|resume|algorithm|javascript-functions|ui-coding ...]
 *
 * No args = every set. Rows are linkless (url null).
 */
import { createClient } from '@supabase/supabase-js'

const SETS = {
  backend: () => import('./prep-2026/backend.mjs'),
  'code-review': () => import('./prep-2026/code-review.mjs'),
  'system-design': () => import('./prep-2026/system-design.mjs'),
  resume: () => import('./prep-2026/resume.mjs'),
  algorithm: () => import('./prep-2026/algorithm.mjs'),
  'javascript-functions': () => import('./prep-2026/javascript-functions.mjs'),
  'ui-coding': () => import('./prep-2026/ui-coding.mjs'),
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SETS)

for (const category of wanted) {
  if (!SETS[category]) { console.error(`unknown set ${category}`); process.exit(1) }
  const mod = await SETS[category]()
  // A set may also patch existing rows (system-design appends a full-stack
  // extension to the old questions' hints; algorithm, javascript-functions and ui-coding set the importance order).
  if (mod.patch) console.log(`${category}: patched ${await mod.patch(db)} existing rows`)
  const rows = mod.default
  const { data: existing, error } = await db.from('coding_questions').select('id, title').eq('category', category)
  if (error) throw new Error(error.message)
  const byTitle = new Map((existing ?? []).map(r => [r.title, r.id]))
  let inserted = 0, updated = 0
  for (const r of rows) {
    const row = {
      title: r.title, difficulty: r.difficulty, topics: r.topics, sort_order: r.sort_order ?? null,
      answer_hints: r.answer_hints, category, source: 'Prep additions', url: r.url ?? null,
      ...(r.body !== undefined ? { body: r.body } : {}),
    }
    const id = byTitle.get(r.title)
    const res = id
      ? await db.from('coding_questions').update(row).eq('id', id)
      : await db.from('coding_questions').insert(row)
    if (res.error) throw new Error(`${category} / ${r.title}: ${res.error.message}`)
    id ? updated++ : inserted++
  }
  console.log(`${category}: ${inserted} inserted, ${updated} updated (${rows.length} in set)`)
}
