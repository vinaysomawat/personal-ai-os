'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Reads the DOM attribute the beforeInteractive script in layout.tsx already
// set, falling back to the same localStorage/time-of-day rule independently
// in case that script hasn't run yet. Only ever called client-side, from the
// mount effect below — never during the initial render — because calling it
// during render would make React's first client render (used for hydration)
// disagree with the server render (which has no `document` and always
// produces 'dark'), corrupting the DOM tree it's trying to hydrate.
function getInitialTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'light' || attr === 'dark') return attr
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') return stored
  const h = new Date().getHours()
  return h >= 6 && h < 18 ? 'light' : 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Starts at the same 'dark' default the server render used, so the initial
  // client render matches the server's HTML exactly — anything else here
  // caused a hydration mismatch (and a follow-on DOM crash) on every page.
  const [theme, setThemeState] = useState<Theme>('dark')

  // Corrects to the real theme right after mount. This DOM write + state
  // update happens post-hydration, so it's an ordinary client re-render, not
  // part of the hydration diff — no mismatch, even though the value often
  // changes (e.g. to 'light' during the day).
  useEffect(() => {
    const actual = getInitialTheme()
    setThemeState(actual)
    document.documentElement.setAttribute('data-theme', actual)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('theme', t)
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
