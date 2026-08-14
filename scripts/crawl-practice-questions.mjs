/**
 * One-time (re-runnable) import of Quiz + System Design questions into
 * coding_questions (quiz.md's generalized practice platform) — title,
 * url, and difficulty only, matching the existing algorithm-question pool's
 * shape. Not part of the deployed app, same category as the repo's earlier
 * uncommitted AI title-inference backfill script.
 *
 * GreatFrontEnd's question listing pages are client-rendered (the data
 * loads via JS after the initial HTML, not present in a plain fetch), so
 * this script does NOT scrape GreatFrontEnd itself over HTTP — it reads two
 * JSON files already extracted from the live, logged-in page via browser
 * JS (`document.querySelectorAll` over the rendered card list), one row
 * per question: { slug, title, difficulty }. To refresh with newly
 * published questions later, re-run that same in-browser extraction
 * (see the extract snippets below) against your own logged-in session,
 * save the two JSON files to the same paths, then re-run this script —
 * it's idempotent, upserting on `url`.
 *
 * Quiz extraction — run in the browser console on
 * https://www.greatfrontend.com/questions/quiz while logged in:
 *
 *   const items = Array.from(document.querySelectorAll('a'))
 *     .filter(a => { try { return new URL(a.href).pathname.startsWith('/questions/quiz/') } catch { return false } })
 *     .map(a => {
 *       const path = new URL(a.href).pathname
 *       const card = a.parentElement.parentElement.parentElement.parentElement
 *       const m = card.textContent.match(/^(.*?)Quiz.*?Difficulty(Easy|Medium|Hard)/)
 *       return { slug: path.replace('/questions/quiz/', ''), title: m ? m[1].trim() : null, difficulty: m ? m[2].toLowerCase() : null }
 *     })
 *   const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
 *   const a = document.createElement('a')
 *   a.href = URL.createObjectURL(blob); a.download = 'gfe-quiz-questions.json'
 *   document.body.appendChild(a); a.click(); a.remove()
 *
 * System Design extraction — same page pattern on
 * https://www.greatfrontend.com/questions/system-design, except title comes
 * from `a.textContent.trim()` directly (system-design cards also carry a
 * description that would otherwise get swept into the title via the regex):
 *
 *   const items = Array.from(document.querySelectorAll('a'))
 *     .filter(a => { try { return new URL(a.href).pathname.startsWith('/questions/system-design/') } catch { return false } })
 *     .map(a => {
 *       const path = new URL(a.href).pathname
 *       const card = a.parentElement.parentElement.parentElement.parentElement
 *       const m = card.textContent.match(/Difficulty(Easy|Medium|Hard)/)
 *       return { slug: path.replace('/questions/system-design/', ''), title: a.textContent.trim(), difficulty: m ? m[1].toLowerCase() : null }
 *     })
 *   // ...same Blob+download as above, filename gfe-system-design-questions.json
 *
 * Usage:
 *   node scripts/crawl-practice-questions.mjs [quizFile] [systemDesignFile]
 *   (defaults to ~/Downloads/gfe-quiz-questions.json and
 *   ~/Downloads/gfe-system-design-questions.json)
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

const quizFile = process.argv[2] ?? join(homedir(), 'Downloads', 'gfe-quiz-questions.json')
const systemDesignFile = process.argv[3] ?? join(homedir(), 'Downloads', 'gfe-system-design-questions.json')

function loadRows(path, category, urlPrefix) {
  const items = JSON.parse(readFileSync(path, 'utf-8'))
  return items
    .filter(i => i.slug && i.title && i.difficulty)
    .map(i => ({
      title: i.title,
      difficulty: i.difficulty,
      url: `${urlPrefix}${i.slug}`,
      source: 'GreatFrontEnd',
      category,
      topics: null,
    }))
}

const rows = [
  ...loadRows(quizFile, 'quiz', 'https://www.greatfrontend.com/questions/quiz/'),
  ...loadRows(systemDesignFile, 'system-design', 'https://www.greatfrontend.com/questions/system-design/'),
]

console.log(`Loaded ${rows.length} rows from local extraction files (${quizFile}, ${systemDesignFile}).`)

// Dedupe on url — upsert-safe to re-run if new questions get added later
// and re-extracted into the same two JSON files.
const { data: existing } = await supabase.from('coding_questions').select('url').in('category', ['quiz', 'system-design'])
const existingUrls = new Set((existing ?? []).map(r => r.url))
const toInsert = rows.filter(r => !existingUrls.has(r.url))

console.log(`${toInsert.length} new rows to insert (${rows.length - toInsert.length} already present).`)

if (toInsert.length > 0) {
  const { error } = await supabase.from('coding_questions').insert(toInsert)
  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }
}

console.log('Done.')
