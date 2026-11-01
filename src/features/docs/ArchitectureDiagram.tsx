// The request flow at a glance, as stacked cards rather than an SVG so the
// text stays readable at phone width. Facts mirror docs/architecture.md.
const Box = ({ title, lines, tone = 'plain' }: { title: string; lines: string[]; tone?: 'plain' | 'accent' }) => (
  <div className={`rounded-[10px] border px-3 py-2 ${tone === 'accent' ? 'bg-accent-soft border-accent-border' : 'bg-surface-1 border-surface-3'}`}>
    <div className="text-[12.5px] font-semibold text-fg-primary">{title}</div>
    {lines.map(l => <div key={l} className="text-[11.5px] text-fg-secondary leading-snug mt-0.5">{l}</div>)}
  </div>
)
const Down = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center gap-1.5 text-[11px] text-fg-tertiary py-1">↓ <span>{label}</span></div>
)

export function ArchitectureDiagram() {
  return (
    <figure className="my-3 rounded-[10px] border border-surface-3 bg-surface-2 p-3" aria-label="Architecture: who calls what">
      <div className="grid sm:grid-cols-3 gap-2">
        <Box title="Browser" lines={['you, signed in (Supabase auth cookie)']} />
        <Box title="Telegram" lines={['text, voice or a photo to a module bot']} />
        <Box title="Vercel Cron" lines={['digests, reminders, health check', 'Authorization: Bearer CRON_SECRET']} />
      </div>
      <Down label="HTTPS" />
      <Box tone="accent" title="Next.js 15 app on Vercel" lines={[
        'app/[route]/page.tsx (server component, fetches) → features/[module]/components/*View.tsx (client, optimistic UI)',
        "features/[module]/actions.ts ('use server') for every mutation",
        'api/telegram/[module] webhooks · api/cron/* jobs — rule engine first, AI only for judgment',
      ]} />
      <Down label="queries and AI calls" />
      <div className="grid sm:grid-cols-3 gap-2">
        <Box title="Supabase Postgres" lines={['Row Level Security on every user table', 'cookie client for pages · service-role client for crons and bots']} />
        <Box title="AI Gateway — askAI()" lines={['model routing per task', 'ai_cache responses · ai_usage_logs spend', 'daily / monthly ceiling → Anthropic Claude']} />
        <Box title="Groq Whisper" lines={['voice notes and 🎙 Speak → text']} />
      </div>
    </figure>
  )
}
