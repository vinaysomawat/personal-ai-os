'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { Plus, Trash2, ExternalLink, Github, X, Wand2, Copy, Check } from 'lucide-react'
import Card from '@/components/Card'
import { addProject, updateProjectStatus, deleteProject } from '../actions'
import { generatePlaywrightTests } from '@/features/ai/playwright-generator'
import type { Project, ProjectStatus } from '../types'
import type { PlaywrightOutput } from '@/features/ai/playwright-generator'

type OutputTab = keyof PlaywrightOutput

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  'idea':        { label: 'Idea',        color: 'text-slate-400',  bg: 'bg-slate-500/15' },
  'in-progress': { label: 'In Progress', color: 'text-amber-400',  bg: 'bg-amber-500/15' },
  'paused':      { label: 'Paused',      color: 'text-blue-400',   bg: 'bg-blue-500/15' },
  'completed':   { label: 'Completed',   color: 'text-green-400',  bg: 'bg-green-500/15' },
}

const STATUSES = Object.keys(STATUS_CONFIG) as ProjectStatus[]

interface Props { initialProjects: Project[] }

const TABS: { key: OutputTab; label: string }[] = [
  { key: 'scenarios',  label: 'Scenarios' },
  { key: 'pageObject', label: 'Page Object' },
  { key: 'testFile',   label: 'Test File' },
  { key: 'edgeCases',  label: 'Edge Cases' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
      {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function CodingView({ initialProjects }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all')
  const [isPending, startTransition] = useTransition()

  // Playwright generator
  const [story, setStory] = useState('')
  const [pwOutput, setPwOutput] = useState<PlaywrightOutput | null>(null)
  const [pwLoading, setPwLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<OutputTab>('scenarios')

  const handleGenerate = async () => {
    if (!story.trim() || pwLoading) return
    setPwLoading(true); setPwOutput(null)
    try {
      const result = await generatePlaywrightTests(story)
      setPwOutput(result)
      setActiveTab('scenarios')
    } finally { setPwLoading(false) }
  }

  const [projects, updateProjects] = useOptimistic(
    initialProjects,
    (state: Project[], action: { type: string; payload: Partial<Project> & { id?: string } }) => {
      if (action.type === 'add') return [action.payload as Project, ...state]
      if (action.type === 'status') return state.map(p => p.id === action.payload.id ? { ...p, status: action.payload.status! } : p)
      if (action.type === 'delete') return state.filter(p => p.id !== action.payload.id)
      return state
    }
  )

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: projects.filter(p => p.status === s).length }), {} as Record<ProjectStatus, number>)

  const handleAdd = async (formData: FormData) => {
    const stackRaw = formData.get('stack') as string
    const optimistic: Project = {
      id: `temp-${Date.now()}`, user_id: '',
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      status: formData.get('status') as ProjectStatus || 'idea',
      stack: stackRaw ? stackRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
      github_url: formData.get('github_url') as string || null,
      live_url: formData.get('live_url') as string || null,
      created_at: new Date().toISOString(),
    }
    setShowForm(false)
    startTransition(async () => {
      updateProjects({ type: 'add', payload: optimistic })
      await addProject(formData)
    })
  }

  const handleStatus = (id: string, status: ProjectStatus) => {
    startTransition(async () => {
      updateProjects({ type: 'status', payload: { id, status } })
      await updateProjectStatus(id, status)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      updateProjects({ type: 'delete', payload: { id } })
      await deleteProject(id)
    })
  }

  return (
    <div className="space-y-5">
      {/* Playwright Test Generator */}
      <Card title="Playwright Test Generator" action={
        <span className="text-xs text-slate-600">Paste a Jira story → AI writes tests</span>
      }>
        <div className="space-y-3">
          <textarea
            value={story}
            onChange={e => setStory(e.target.value)}
            placeholder={`Paste your user story or requirement here...\n\nExample:\nAs a user, I want to log in with my email and password\nso that I can access my dashboard.\n\nAC:\n- Valid credentials → redirect to /dashboard\n- Invalid password → show "Invalid credentials" error\n- Empty fields → show validation messages`}
            rows={6}
            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors resize-none font-mono"
          />
          <button onClick={handleGenerate} disabled={pwLoading || !story.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors">
            <Wand2 size={14} /> {pwLoading ? 'Generating tests...' : 'Generate Tests'}
          </button>

          {pwLoading && (
            <div className="space-y-2 pt-1">
              {[75, 90, 60, 85, 70].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
            </div>
          )}

          {pwOutput && (
            <div className="border border-surface-3 rounded-xl overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-surface-3">
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`px-4 py-2.5 text-xs font-medium transition-colors ${activeTab === t.key ? 'bg-surface-2 text-slate-200 border-b-2 border-accent' : 'text-slate-500 hover:text-slate-400'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              {/* Content */}
              <div className="relative bg-surface-2 p-4">
                <div className="absolute top-3 right-3">
                  <CopyButton text={pwOutput[activeTab]} />
                </div>
                <pre className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-96 pr-16">
                  {pwOutput[activeTab] || '—'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === 'all' ? 'bg-accent text-white' : 'bg-surface-1 border border-surface-3 text-slate-400 hover:bg-surface-2'}`}>
          All ({projects.length})
        </button>
        {STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s]
          return (
            <button key={s} onClick={() => setFilter(filter === s ? 'all' : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? `${cfg.bg} ${cfg.color}` : 'bg-surface-1 border border-surface-3 text-slate-400 hover:bg-surface-2'}`}>
              {cfg.label} ({counts[s]})
            </button>
          )
        })}
      </div>

      <Card title="Projects" action={
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
          <Plus size={12} /> Add
        </button>
      }>
        {filtered.length === 0 && <p className="text-sm text-slate-600 text-center py-8">No projects yet</p>}
        <ul className="space-y-2">
          {filtered.map(p => {
            const cfg = STATUS_CONFIG[p.status]
            return (
              <li key={p.id} className="p-3 rounded-lg bg-surface-2 border border-surface-3 group">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200">{p.name}</span>
                      {p.github_url && <a href={p.github_url} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-accent transition-colors"><Github size={13} /></a>}
                      {p.live_url && <a href={p.live_url} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-accent transition-colors"><ExternalLink size={11} /></a>}
                    </div>
                    {p.description && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{p.description}</p>}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <select value={p.status} onChange={e => handleStatus(p.id, e.target.value as ProjectStatus)} disabled={isPending}
                        className={`text-xs px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer font-medium ${cfg.color} ${cfg.bg}`}>
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                      </select>
                      {p.stack.map(t => (
                        <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-surface-3 text-slate-400 font-mono">{t}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(p.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-200">Add Project</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form action={handleAdd} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Name *</label>
                <input name="name" required placeholder="Vinay AI OS" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Description</label>
                <textarea name="description" rows={2} placeholder="What this project does..." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Status</label>
                  <select name="status" defaultValue="idea" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Stack</label>
                  <input name="stack" placeholder="React, Node, Postgres" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">GitHub</label>
                  <input name="github_url" type="url" placeholder="https://github.com/..." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Live URL</label>
                  <input name="live_url" type="url" placeholder="https://..." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
