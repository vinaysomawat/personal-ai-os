import Link from 'next/link'
import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const error = params.error

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent mb-4">
            <span className="text-white font-bold text-xl">V</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Personal OS</h1>
          <p className="text-sm text-fg-tertiary mt-1">Your personal AI operating system</p>
        </div>

        {/* Alerts */}
        {error === 'invalid_credentials' && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-risk-soft border border-red-500/20 text-sm text-red-400">
            Invalid email or password.
          </div>
        )}
        {/* Form */}
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-6">
          <form className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-fg-secondary uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-fg-secondary uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                formAction={login}
                className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors"
              >
                Sign in
              </button>
              <Link
                href="/self-host"
                className="flex-1 py-2.5 rounded-lg bg-surface-2 border border-surface-3 text-fg-secondary text-sm font-medium hover:bg-surface-3 transition-colors text-center"
              >
                Not the owner? Build your own
              </Link>
            </div>
          </form>
        </div>

        <footer className="text-center mt-8 text-xs text-fg-quaternary">
          Made by Vinay, using Claude
        </footer>
      </div>
    </div>
  )
}
