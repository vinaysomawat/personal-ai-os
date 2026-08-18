/**
 * One-time (re-runnable) topic backfill for coding_questions rows whose
 * `topics` column is null — the quiz/system-design pool (never got topics
 * in the first place, since GreatFrontEnd's bulk listing pages don't expose
 * topic tags outside each question's own detail page) plus any newer
 * algorithm rows added since the original backfill. Not part of the
 * deployed app, same category as the repo's crawl/refresh scripts — this
 * replaces the original uncommitted AI title-inference script (README §7),
 * using the same title-only, low-hallucination-risk approach: titles like
 * "Array.prototype.map" are literal enough to classify without needing the
 * full question body.
 *
 * Calls the Anthropic API directly (not askAI()) — this is a standalone
 * one-off script outside the Next.js app's request-scoped budget tracking,
 * same convention as every other script in this directory.
 *
 * Usage:
 *   node scripts/backfill-practice-topics.mjs
 */
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ANTHROPIC_API_KEY in the environment.')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
const HAIKU_MODEL = 'claude-haiku-4-5'

// Same 14-topic vocabulary the original (uncommitted) backfill converged
// on for the algorithm pool (README §7) — not a shared app-level constant
// since nothing in the deployed app needs to import this list.
const TOPICS = [
  'Algorithms', 'Array & Object Methods', 'Async & Promises', 'CSS & Layout', 'Data Structures',
  'DOM & Browser APIs', 'JavaScript Fundamentals', 'Networking & APIs', 'Performance',
  'React & State Management', 'System Design', 'Testing', 'TypeScript', 'UI Components',
]

const BATCH_SIZE = 10

const { data: rows, error: fetchError } = await supabase
  .from('coding_questions')
  .select('id, title, difficulty, category')
  .is('topics', null)

if (fetchError) {
  console.error('Fetch failed:', fetchError.message)
  process.exit(1)
}

console.log(`${rows.length} rows with null topics to backfill.`)

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const results = [] // { id, title, topics }

// Correlate by title text, not array position — a batched JSON-array
// response that comes back shifted/misaligned by even one entry silently
// misassigns every topic after the shift point, which is exactly what
// happened on the first attempt at this script (verified by spot-checking:
// several testing-related titles ended up tagged "Performance"/"System
// Design" instead of "Testing"). Asking the model to echo the title back
// per entry and matching on that string eliminates the entire bug class —
// a title that doesn't match anything in the batch is skipped, not
// silently misassigned to the wrong row.
for (const batch of chunk(rows, BATCH_SIZE)) {
  const listing = batch.map(r => `- [${r.category}] ${r.title}`).join('\n')
  const prompt = `Classify each frontend/web-dev practice question below into 1-3 topics from this fixed list (use these exact strings, nothing else):
${TOPICS.map(t => `- ${t}`).join('\n')}

Questions:
${listing}

Respond with ONLY a JSON array, one entry per question, in any order. Each entry must be {"title": "<exact question title as given, without the [category] prefix>", "topics": ["Topic1", "Topic2"]} with 1-3 topics from the list above. Example: [{"title":"Explain closures","topics":["JavaScript Fundamentals"]}]`

  const msg = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = msg.content.find(b => b.type === 'text')
  const text = block?.type === 'text' ? block.text.trim() : '[]'
  const jsonStart = text.indexOf('[')
  const jsonEnd = text.lastIndexOf(']')
  let parsed
  try {
    parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
  } catch {
    console.error('Failed to parse batch response, skipping batch:', text.slice(0, 200))
    continue
  }

  const byTitle = new Map(parsed.filter(p => p && typeof p.title === 'string').map(p => [p.title.trim(), p.topics]))
  for (const r of batch) {
    const topics = byTitle.get(r.title.trim())
    const valid = Array.isArray(topics) ? topics.filter(t => TOPICS.includes(t)) : []
    if (valid.length > 0) results.push({ id: r.id, title: r.title, topics: valid })
    else console.error(`  No match/valid topics for: "${r.title}"`)
  }

  console.log(`Classified batch of ${batch.length} (${results.length} total so far).`)
}

console.log(`\n${results.length} rows classified, ${rows.length - results.length} skipped (no valid topics returned).`)

for (const r of results) {
  const { error } = await supabase.from('coding_questions').update({ topics: r.topics }).eq('id', r.id)
  if (error) console.error(`Update failed for ${r.id} (${r.title}):`, error.message)
}

console.log('\nDone. Random sample for hand spot-check:')
const sample = [...results].sort(() => Math.random() - 0.5).slice(0, 15)
for (const r of sample) {
  console.log(`  "${r.title}" -> [${r.topics.join(', ')}]`)
}
