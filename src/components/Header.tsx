'use client'

import { usePathname } from 'next/navigation'

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/planner': 'Planner',
  '/career': 'Career',
  '/finance': 'Finance',
  '/health': 'Health',
  '/learning': 'Learning',
  '/coding': 'Coding',
  '/documents': 'Documents',
  '/settings': 'Settings',
}

export default function Header() {
  const pathname = usePathname()
  const title = titles[pathname] ?? 'Vinay AI OS'

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-surface-1 border-b border-surface-3 shrink-0">
      <h1 className="text-base font-semibold text-white">{title}</h1>
    </header>
  )
}
