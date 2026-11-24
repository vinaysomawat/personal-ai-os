/**
 * Run after deploying to Vercel:
 *   node --env-file=.env.local scripts/setup-webhooks.mjs https://your-app.vercel.app
 *
 * Re-run whenever ALLOWED_UPDATES or COMMANDS change — Telegram only delivers
 * the update types a webhook subscribed to, and the "/" menu only lists what
 * setMyCommands registered.
 */

// message: text/voice/photo. callback_query: inline-button taps (Undo, quiz
// category picker, quiz self-grade). poll_answer: answers to quiz polls
// (only sent for non-anonymous polls).
const ALLOWED_UPDATES = ['message', 'callback_query', 'poll_answer']

// Slash commands shown in each bot's "/" menu. setMyCommands replaces the
// whole list, so a module missing here gets its menu cleared.
const COMMANDS = {
  planner: [{ command: 'quiz', description: 'Start an 8-question quiz' }],
}

const BASE_URL = process.argv[2]
if (!BASE_URL) {
  console.error('Usage: node scripts/setup-webhooks.mjs https://your-app.vercel.app')
  process.exit(1)
}

const MODULES = ['planner', 'finance', 'health', 'astrology']

const TOKEN_MAP = {
  planner:   process.env.TELEGRAM_BOT_TOKEN_PLANNER,
  finance:   process.env.TELEGRAM_BOT_TOKEN_FINANCE,
  health:    process.env.TELEGRAM_BOT_TOKEN_HEALTH,
  astrology: process.env.TELEGRAM_BOT_TOKEN_ASTROLOGY,
}

for (const module of MODULES) {
  const token = TOKEN_MAP[module]
  if (!token) {
    console.log(`⚠️  TELEGRAM_BOT_TOKEN_${module.toUpperCase()} not set — skipping`)
    continue
  }
  const webhookUrl = `${BASE_URL}/api/telegram/${module}`
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ALLOWED_UPDATES }),
  })
  const data = await res.json()
  console.log(`${data.ok ? '✅' : '❌'} ${module}: ${webhookUrl} — ${data.description ?? ''}`)

  const cmdRes = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commands: COMMANDS[module] ?? [] }),
  })
  const cmdData = await cmdRes.json()
  const names = (COMMANDS[module] ?? []).map(c => `/${c.command}`).join(' ') || '(none)'
  console.log(`   ${cmdData.ok ? '✅' : '❌'} commands: ${names} ${cmdData.description ?? ''}`)
}
