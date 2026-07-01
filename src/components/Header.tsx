import { useLocation } from 'react-router-dom'
import { Search, Bell } from 'lucide-react'

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/planner': 'Planner',
  '/career': 'Career',
  '/finance': 'Finance',
  '/health': 'Health',
  '/learning': 'Learning',
  '/coding': 'Coding',
  '/documents': 'Documents',
}

export default function Header() {
  const { pathname } = useLocation()
  const title = titles[pathname] ?? 'Vinay AI OS'

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-surface-1 border-b border-surface-3 shrink-0">
      <h1 className="text-base font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-1.5 text-sm text-slate-400">
          <Search size={13} />
          <span>Search...</span>
          <kbd className="ml-2 text-xs bg-surface-3 text-slate-500 px-1.5 py-0.5 rounded">⌘K</kbd>
        </div>
        <button className="relative p-1.5 rounded-lg text-slate-400 hover:bg-surface-2 hover:text-slate-200 transition-colors">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" />
        </button>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-xs font-bold text-white">
          V
        </div>
      </div>
    </header>
  )
}
