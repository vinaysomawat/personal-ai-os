/**
 * Run after deploying to Vercel:
 *   node scripts/setup-webhooks.mjs https://your-app.vercel.app
 */

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
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message'] }),
  })
  const data = await res.json()
  console.log(`${data.ok ? '✅' : '❌'} ${module}: ${webhookUrl} — ${data.description ?? ''}`)
}
