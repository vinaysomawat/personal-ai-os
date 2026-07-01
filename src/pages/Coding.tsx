import Card from '../components/Card'
import { Github, GitBranch, GitCommit, Plus, Star, Circle } from 'lucide-react'

interface Project {
  name: string
  desc: string
  lang: string
  langColor: string
  stars: number
  lastCommit: string
  status: 'Active' | 'Paused' | 'Done'
}

const projects: Project[] = [
  { name: 'vinay-ai-os', desc: 'Personal AI Operating System', lang: 'TypeScript', langColor: 'bg-blue-400', stars: 0, lastCommit: '1h ago', status: 'Active' },
  { name: 'dsa-patterns', desc: 'Curated DSA patterns for interviews', lang: 'Python', langColor: 'bg-yellow-400', stars: 12, lastCommit: '2 days ago', status: 'Active' },
  { name: 'expense-tracker', desc: 'CLI budget tracker', lang: 'Go', langColor: 'bg-cyan-400', stars: 3, lastCommit: '1 week ago', status: 'Paused' },
  { name: 'portfolio-v3', desc: 'Next.js personal site', lang: 'TypeScript', langColor: 'bg-blue-400', stars: 5, lastCommit: '2 weeks ago', status: 'Done' },
]

const snippets = [
  { title: 'Debounce hook', lang: 'React', date: 'Jun 29' },
  { title: 'Binary search template', lang: 'Python', date: 'Jun 28' },
  { title: 'SQL window functions', lang: 'SQL', date: 'Jun 26' },
  { title: 'Go goroutine pool', lang: 'Go', date: 'Jun 22' },
]

const statusColor = {
  Active: 'bg-green-500/15 text-green-400',
  Paused: 'bg-amber-500/15 text-amber-400',
  Done: 'bg-slate-500/15 text-slate-400',
}

export default function Coding() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Github, label: 'GitHub streak', value: '18 days' },
          { icon: GitCommit, label: 'Commits this week', value: '23' },
          { icon: GitBranch, label: 'Active PRs', value: '2' },
        ].map(s => (
          <Card key={s.label}>
            <s.icon size={16} className="text-slate-500 mb-2" />
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card
        title="Projects"
        action={
          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/20 text-accent text-xs font-medium hover:bg-accent/30 transition-colors">
            <Plus size={12} />
            New
          </button>
        }
      >
        <div className="space-y-2">
          {projects.map(p => (
            <div
              key={p.name}
              className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors group cursor-pointer"
            >
              <Github size={16} className="text-slate-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 font-mono">{p.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                <span className="flex items-center gap-1">
                  <Circle size={8} className={`fill-current ${p.langColor.replace('bg-', 'text-')}`} />
                  {p.lang}
                </span>
                {p.stars > 0 && (
                  <span className="flex items-center gap-0.5 text-amber-400">
                    <Star size={11} className="fill-amber-400" /> {p.stars}
                  </span>
                )}
                <span className="text-slate-600">{p.lastCommit}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[p.status]}`}>{p.status}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Saved Snippets">
        <ul className="space-y-1.5">
          {snippets.map(s => (
            <li
              key={s.title}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <code className="text-xs bg-surface-3 text-accent px-1.5 py-0.5 rounded shrink-0">{s.lang}</code>
              <p className="flex-1 text-sm text-slate-300">{s.title}</p>
              <span className="text-xs text-slate-600">{s.date}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
