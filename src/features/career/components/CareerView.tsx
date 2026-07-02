'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { Plus, Trash2, ExternalLink, X } from 'lucide-react'
import Card from '@/components/Card'
import { addApplication, updateStatus, deleteApplication } from '../actions'
import type { Application, AppStatus } from '../types'

const STATUS_CONFIG: Record<AppStatus, { label: string; color: string; bg: string }> = {
  applied:   { label: 'Applied',   color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  screening: { label: 'Screening', color: 'text-amber-400',  bg: 'bg-amber-400/10' },
  interview: { label: 'Interview', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  offer:     { label: 'Offer',     color: 'text-green-400',  bg: 'bg-green-500/10' },
  rejected:  { label: 'Rejected',  color: 'text-red-400',    bg: 'bg-red-400/10' },
}

const STATUSES = Object.keys(STATUS_CONFIG) as AppStatus[]

interface Props {
  initialApplications: Application[]
}

export default function CareerView({ initialApplications }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<AppStatus | 'all'>('all')
  const [isPending, startTransition] = useTransition()

  const [optimisticApps, updateOptimistic] = useOptimistic(
    initialApplications,
    (state: Application[], action: { type: string; payload: Partial<Application> & { id?: string } }) => {
      if (action.type === 'add') return [action.payload as Application, ...state]
      if (action.type === 'status') return state.map(a => a.id === action.payload.id ? { ...a, status: action.payload.status! } : a)
      if (action.type === 'delete') return state.filter(a => a.id !== action.payload.id)
      return state
    }
  )

  const filtered = filterStatus === 'all' ? optimisticApps : optimisticApps.filter(a => a.status === filterStatus)
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: optimisticApps.filter(a => a.status === s).length }), {} as Record<AppStatus, number>)

  const handleAdd = async (formData: FormData) => {
    const optimistic: Application = {
      id: `temp-${Date.now()}`,
      user_id: '',
      company: formData.get('company') as string,
      role: formData.get('role') as string,
      status: (formData.get('status') as AppStatus) ?? 'applied',
      salary_range: formData.get('salary_range') as string || null,
      location: formData.get('location') as string || null,
      url: formData.get('url') as string || null,
      notes: formData.get('notes') as string || null,
      applied_at: formData.get('applied_at') as string || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    }
    setShowForm(false)
    startTransition(async () => {
      updateOptimistic({ type: 'add', payload: optimistic })
      await addApplication(formData)
    })
  }

  const handleStatus = (id: string, status: AppStatus) => {
    startTransition(async () => {
      updateOptimistic({ type: 'status', payload: { id, status } })
      await updateStatus(id, status)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      updateOptimistic({ type: 'delete', payload: { id } })
      await deleteApplication(id)
    })
  }

  return (
    <div className="space-y-5">
      {/* Pipeline summary */}
      <div className="grid grid-cols-5 gap-2">
        {STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s]
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
              className={`flex flex-col items-center p-3 rounded-xl border transition-colors ${
                filterStatus === s
                  ? `${cfg.bg} border-current ${cfg.color}`
                  : 'bg-surface-1 border-surface-3 text-slate-400 hover:bg-surface-2'
              }`}
            >
              <span className="text-xl font-bold">{counts[s]}</span>
              <span className="text-xs mt-0.5">{cfg.label}</span>
            </button>
          )
        })}
      </div>

      {/* Applications list */}
      <Card
        title={filterStatus === 'all' ? 'All Applications' : STATUS_CONFIG[filterStatus].label}
        action={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors"
          >
            <Plus size={12} /> Add
          </button>
        }
      >
        {filtered.length === 0 && (
          <p className="text-sm text-slate-600 text-center py-8">
            {filterStatus === 'all' ? 'No applications yet — add one above' : `No ${STATUS_CONFIG[filterStatus].label.toLowerCase()} applications`}
          </p>
        )}
        <ul className="space-y-2">
          {filtered.map(app => {
            const cfg = STATUS_CONFIG[app.status]
            return (
              <li key={app.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface-2 border border-surface-3 group transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-200">{app.company}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-sm text-slate-400">{app.role}</span>
                    {app.url && (
                      <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-accent transition-colors">
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <select
                      value={app.status}
                      onChange={e => handleStatus(app.id, e.target.value as AppStatus)}
                      disabled={isPending}
                      className={`text-xs px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer font-medium ${cfg.color} ${cfg.bg}`}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                    </select>
                    {app.location && <span className="text-xs text-slate-600">{app.location}</span>}
                    {app.salary_range && <span className="text-xs text-slate-600">{app.salary_range}</span>}
                    <span className="text-xs text-slate-700">{app.applied_at}</span>
                  </div>
                  {app.notes && <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">{app.notes}</p>}
                </div>
                <button
                  onClick={() => handleDelete(app.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all mt-0.5"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            )
          })}
        </ul>
      </Card>

      {/* Add modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-200">Add Application</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>
            <form action={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Company *</label>
                  <input name="company" required placeholder="Google" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Role *</label>
                  <input name="role" required placeholder="Senior Engineer" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Status</label>
                  <select name="status" defaultValue="applied" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Applied On</label>
                  <input name="applied_at" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Location</label>
                  <input name="location" placeholder="Remote / Bangalore" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Salary Range</label>
                  <input name="salary_range" placeholder="₹40–60 LPA" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Job URL</label>
                <input name="url" type="url" placeholder="https://..." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Notes</label>
                <textarea name="notes" rows={2} placeholder="Referral from X, interesting stack..." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors">
                  Add Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
