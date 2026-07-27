import Link from 'next/link'

export default function SelfHostPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent mb-4">
            <span className="text-white font-bold text-xl">V</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Run your own Personal OS</h1>
          <p className="text-sm text-fg-tertiary mt-1">
            This is a personal, single-user instance — not a shared app. Here&apos;s how to get your own, free.
          </p>
        </div>

        <div className="bg-surface-1 border border-surface-3 rounded-xl p-6">
          <ol className="list-decimal list-inside space-y-3 text-sm text-fg-secondary">
            <li>
              Clone the repo:{' '}
              <a
                className="text-accent hover:underline"
                href="https://github.com/vinaysomawat/personal-ai-os"
                target="_blank"
                rel="noreferrer"
              >
                github.com/vinaysomawat/personal-ai-os
              </a>
            </li>
            <li>
              Create a free{' '}
              <a className="text-accent hover:underline" href="https://supabase.com" target="_blank" rel="noreferrer">
                Supabase
              </a>{' '}
              project and run the SQL files in{' '}
              <code className="text-xs bg-surface-2 px-1 py-0.5 rounded">supabase/migrations/</code>, in order.
            </li>
            <li>
              Get an API key from{' '}
              <a className="text-accent hover:underline" href="https://console.anthropic.com" target="_blank" rel="noreferrer">
                console.anthropic.com
              </a>{' '}
              (and optionally{' '}
              <a className="text-accent hover:underline" href="https://console.groq.com" target="_blank" rel="noreferrer">
                console.groq.com
              </a>{' '}
              for voice notes).
            </li>
            <li>Deploy using the one-click Vercel button in the README, or your own <code className="text-xs bg-surface-2 px-1 py-0.5 rounded">vercel deploy</code>.</li>
            <li>
              Sign up on your own deployment, then copy your user ID from Supabase → Authentication → Users into
              {' '}<code className="text-xs bg-surface-2 px-1 py-0.5 rounded">SUPABASE_USER_ID</code>.
            </li>
            <li>Lock down signups on your own Supabase project once your account exists.</li>
          </ol>
          <p className="text-xs text-fg-tertiary pt-4 mt-4 border-t border-surface-3">
            Full walkthrough — including optional per-module Telegram bots — is in the repo&apos;s README under
            &ldquo;Deploying your own instance.&rdquo;
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 mt-6">
          <a href="https://buymeacoffee.com/r194dme8y/c/19242327" target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" className="h-10" />
          </a>
          <Link href="/login" className="text-xs text-fg-tertiary hover:text-fg-secondary transition-colors">
            ← Back to sign in
          </Link>
        </div>

        <footer className="text-center mt-8 text-xs text-fg-quaternary">
          Made by Vinay, using Claude
        </footer>
      </div>
    </div>
  )
}
