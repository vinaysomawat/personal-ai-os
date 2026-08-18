/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Design system surfaces — CSS-variable-backed so [data-theme] can swap
        // light/dark values (see globals.css) without touching call sites.
        surface: {
          DEFAULT: 'var(--bg)',
          1: 'var(--card)',
          2: 'var(--surface-2)',
          3: 'var(--border)',
        },
        'bg-translucent': 'var(--bg-translucent)',
        'border-strong': 'var(--border-strong)',
        overlay: 'var(--overlay)',
        // Flat, not nested under `good`/`risk`, so call sites can use
        // `text-on-good`/`text-on-risk` (matching the `--on-good`/`--on-risk`
        // CSS variable names) rather than the `text-good-on`/`text-risk-on`
        // Tailwind's nested-key convention would otherwise generate — that
        // mismatch previously made every `text-on-good` use silently invalid
        // (no CSS emitted), so those buttons' text fell back to the browser
        // default color instead of the theme-correct contrast color. Both
        // tokens exist because `good`/`risk` flip which end is light vs.
        // dark between themes (bright bg in dark mode, darker bg in light
        // mode), so a single hardcoded text color can't stay readable in
        // both — `on-good`/`on-risk` pick dark or light text per theme to
        // match whichever end of that flip is currently the background.
        'on-good': 'var(--on-good)',
        'on-risk': 'var(--on-risk)',
        // Brand purple — used throughout existing UI
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)',
          border: 'var(--accent-border)',
          strong: 'var(--accent-strong)',
        },
        // Text hierarchy — replaces raw Tailwind slate-* so theme applies everywhere
        fg: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          quaternary: 'var(--text-quaternary)',
        },
        // Semantic status colors — tinted backgrounds only (solid text/icon usage
        // stays on literal Tailwind green/red/amber, which reads fine in both themes)
        good: {
          DEFAULT: 'var(--good)',
          soft: 'var(--good-soft)',
        },
        risk: {
          DEFAULT: 'var(--risk)',
          soft: 'var(--risk-soft)',
          border: 'var(--risk-border)',
          strong: 'var(--risk-strong)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          soft: 'var(--warn-soft)',
        },
        // shadcn CSS variable tokens — required for @apply utilities to resolve
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        card: '0 1px 2px var(--shadow-sm), 0 4px 16px var(--shadow-md)',
        popover: '0 12px 32px var(--shadow-lg)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
