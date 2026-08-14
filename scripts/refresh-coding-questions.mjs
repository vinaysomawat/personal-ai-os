/**
 * One-time (re-runnable) refresh of the algorithm/JS-function/UI-coding
 * question pool (category: 'algorithm') against GreatFrontEnd's current
 * "Coding" tab — insert-only-if-missing, matched on `url`. Never touches
 * existing rows' `topics` (populated once by the original uncommitted AI
 * title-inference script, per README) — new rows are inserted with
 * topics: null, same as quiz/system-design rows, to be backfilled the same
 * way later if desired.
 *
 * Like crawl-practice-questions.mjs, this reads a JSON file extracted from
 * the live, logged-in page via browser JS (the "Coding" tab spans 3
 * GreatFrontEnd sub-formats — user-interface, javascript, algo — all
 * mapped to this app's single 'algorithm' category, matching how the
 * existing 336-row pool already works):
 *
 *   const links = Array.from(document.querySelectorAll('a')).filter(a => {
 *     try {
 *       const p = new URL(a.href).pathname
 *       return (p.startsWith('/questions/user-interface/') || p.startsWith('/questions/javascript/') || p.startsWith('/questions/algo/'))
 *         && a.textContent.trim().length > 0
 *     } catch { return false }
 *   })
 *   const items = links.map(a => {
 *     const path = new URL(a.href).pathname
 *     const card = a.parentElement.parentElement.parentElement.parentElement
 *     const m = card.textContent.match(/Difficulty(Easy|Medium|Hard)/)
 *     const format = path.startsWith('/questions/user-interface/') ? 'user-interface' : path.startsWith('/questions/javascript/') ? 'javascript' : 'algo'
 *     return { slug: path.split('/').pop(), title: a.textContent.trim(), difficulty: m ? m[1].toLowerCase() : null, format }
 *   })
 *   // ...same Blob+download as crawl-practice-questions.mjs, filename gfe-coding-questions.json
 *
 * Usage:
 *   node scripts/refresh-coding-questions.mjs [codingFile]
 *   (defaults to ~/Downloads/gfe-coding-questions.json)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the environment.')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const codingFile = process.argv[2] ?? join(homedir(), 'Downloads', 'gfe-coding-questions.json')

const items = JSON.parse(readFileSync(codingFile, 'utf-8'))
const rows = items
  .filter(i => i.slug && i.title && i.difficulty && i.format)
  .map(i => ({
    title: i.title,
    difficulty: i.difficulty,
    url: `https://www.greatfrontend.com/questions/${i.format}/${i.slug}`,
    source: 'GreatFrontEnd',
    category: 'algorithm',
    topics: null,
  }))

console.log(`Loaded ${rows.length} rows from ${codingFile}.`)

const { data: existing } = await supabase.from('coding_questions').select('url').eq('category', 'algorithm')
const existingUrls = new Set((existing ?? []).map(r => r.url))
const toInsert = rows.filter(r => !existingUrls.has(r.url))

console.log(`${toInsert.length} new rows to insert (${rows.length - toInsert.length} already present, untouched).`)
for (const r of toInsert) console.log(`  + ${r.title} (${r.difficulty}) — ${r.url}`)

if (toInsert.length > 0) {
  const { error } = await supabase.from('coding_questions').insert(toInsert)
  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }
}

console.log('Done.')
