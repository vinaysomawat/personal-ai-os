/**
 * One-time (re-runnable) import of JavaScript Functions + UI Coding
 * questions into coding_questions (quiz.md's generalized practice
 * platform) — title, url, and difficulty only, same shape as the existing
 * algorithm/quiz/system-design pools. Not part of the deployed app, same
 * category as crawl-practice-questions.mjs, whose pattern this mirrors.
 *
 * GreatFrontEnd's question listing pages are client-rendered, so this
 * script does NOT scrape GreatFrontEnd itself over HTTP — it reads two
 * JSON files already extracted from the live, logged-in page via browser
 * JS (`document.querySelectorAll` over the rendered card list), one row
 * per question: { slug, title, difficulty }.
 *
 * JavaScript Functions extraction — run in the browser console on
 * https://www.greatfrontend.com/questions/javascript while logged in:
 *
 *   const items = Array.from(document.querySelectorAll('a'))
 *     .filter(a => { try { return new URL(a.href).pathname.startsWith('/questions/javascript/') } catch { return false } })
 *     .map(a => {
 *       const path = new URL(a.href).pathname
 *       const card = a.parentElement.parentElement.parentElement.parentElement
 *       const m = card.textContent.match(/^(.*?)Difficulty(Easy|Medium|Hard)/)
 *       return { slug: path.replace('/questions/javascript/', ''), title: m ? m[1].trim() : null, difficulty: m ? m[2].toLowerCase() : null }
 *     })
 *   const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
 *   const a = document.createElement('a')
 *   a.href = URL.createObjectURL(blob); a.download = 'gfe-javascript-functions-questions.json'
 *   document.body.appendChild(a); a.click(); a.remove()
 *
 * UI Coding extraction — same page pattern on
 * https://www.greatfrontend.com/questions/user-interface:
 *
 *   const items = Array.from(document.querySelectorAll('a'))
 *     .filter(a => { try { return new URL(a.href).pathname.startsWith('/questions/user-interface/') } catch { return false } })
 *     .map(a => {
 *       const path = new URL(a.href).pathname
 *       const card = a.parentElement.parentElement.parentElement.parentElement
 *       const m = card.textContent.match(/^(.*?)Difficulty(Easy|Medium|Hard)/)
 *       return { slug: path.replace('/questions/user-interface/', ''), title: m ? m[1].trim() : null, difficulty: m ? m[2].toLowerCase() : null }
 *     })
 *   // ...same Blob+download as above, filename gfe-ui-coding-questions.json
 *
 * Usage:
 *   node scripts/crawl-js-functions-ui-coding.mjs [jsFunctionsFile] [uiCodingFile]
 *   (defaults to ~/Downloads/gfe-javascript-functions-questions.json and
 *   ~/Downloads/gfe-ui-coding-questions.json)
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

const jsFunctionsFile = process.argv[2] ?? join(homedir(), 'Downloads', 'gfe-javascript-functions-questions.json')
const uiCodingFile = process.argv[3] ?? join(homedir(), 'Downloads', 'gfe-ui-coding-questions.json')

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
  ...loadRows(jsFunctionsFile, 'javascript-functions', 'https://www.greatfrontend.com/questions/javascript/'),
  ...loadRows(uiCodingFile, 'ui-coding', 'https://www.greatfrontend.com/questions/user-interface/'),
]

console.log(`Loaded ${rows.length} rows from local extraction files (${jsFunctionsFile}, ${uiCodingFile}).`)

// Dedupe on url — upsert-safe to re-run if new questions get added later.
const { data: existing } = await supabase.from('coding_questions').select('url').in('category', ['javascript-functions', 'ui-coding'])
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
