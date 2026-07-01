import Card from '../components/Card'
import { Building2, ExternalLink, Plus } from 'lucide-react'

type Status = 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Saved'

interface Application {
  id: number
  company: string
  role: string
  status: Status
  date: string
}

const applications: Application[] = [
  { id: 1, company: 'Stripe', role: 'Senior Software Engineer', status: 'Interview', date: 'Jun 28' },
  { id: 2, company: 'Vercel', role: 'Software Engineer', status: 'Applied', date: 'Jun 25' },
  { id: 3, company: 'Linear', role: 'Frontend Engineer', status: 'Saved', date: 'Jun 20' },
  { id: 4, company: 'Notion', role: 'Full Stack Engineer', status: 'Rejected', date: 'Jun 15' },
  { id: 5, company: 'Figma', role: 'Software Engineer II', status: 'Applied', date: 'Jun 10' },
]

const statusColor: Record<Status, string> = {
  Applied: 'bg-blue-500/15 text-blue-400',
  Interview: 'bg-amber-500/15 text-amber-400',
  Offer: 'bg-green-500/15 text-green-400',
  Rejected: 'bg-red-500/15 text-red-400',
  Saved: 'bg-slate-500/15 text-slate-400',
}

const goals = [
  { label: 'Applications sent this month', value: 8, target: 15, color: 'bg-blue-500' },
  { label: 'Interviews completed', value: 2, target: 5, color: 'bg-amber-500' },
  { label: 'LeetCode problems', value: 34, target: 50, color: 'bg-accent' },
]

export default function Career() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {goals.map(g => (
          <Card key={g.label}>
            <p className="text-xs text-slate-500 mb-2">{g.label}</p>
            <p className="text-2xl font-bold text-white mb-2">
              {g.value} <span className="text-sm font-normal text-slate-500">/ {g.target}</span>
            </p>
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${g.color}`}
                style={{ width: `${Math.round((g.value / g.target) * 100)}%` }}
              />
            </div>
          </Card>
        ))}
      </div>

      <Card
        title="Applications"
        action={
          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/20 text-accent text-xs font-medium hover:bg-accent/30 transition-colors">
            <Plus size={12} />
            Add
          </button>
        }
      >
        <div className="space-y-2">
          {applications.map(app => (
            <div
              key={app.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                <Building2 size={14} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">{app.role}</p>
                <p className="text-xs text-slate-500">{app.company}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[app.status]}`}>
                {app.status}
              </span>
              <span className="text-xs text-slate-600">{app.date}</span>
              <ExternalLink size={13} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
