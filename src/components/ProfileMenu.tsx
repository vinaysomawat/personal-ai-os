'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { signout } from '@/app/login/actions'
import { Settings, LogOut } from 'lucide-react'

export default function ProfileMenu() {
  const [email, setEmail] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  if (!email) return null
  const initial = email[0].toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Account menu"
        className="w-[34px] h-[34px] rounded-full bg-accent flex items-center justify-center text-[12.5px] font-bold text-white shrink-0"
      >
        {initial}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-11 right-0 z-30 w-[200px] bg-surface-1 border border-surface-3 rounded-xl shadow-popover p-2">
            <p className="px-2.5 py-2 text-[12.5px] text-fg-secondary border-b border-surface-3 mb-1.5 truncate">{email}</p>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2.5 py-[9px] rounded-[7px] text-[13px] text-fg-secondary hover:bg-surface-2 hover:text-fg-primary transition-colors"
            >
              <Settings size={14} /> Settings
            </Link>
            <form action={signout}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-2.5 py-[9px] rounded-[7px] text-[13px] text-fg-secondary hover:bg-surface-2 hover:text-red-400 transition-colors text-left"
              >
                <LogOut size={14} /> Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
