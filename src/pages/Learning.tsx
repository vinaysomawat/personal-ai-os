import Card from '../components/Card'
import { BookOpen, ExternalLink, Star } from 'lucide-react'

interface Course {
  title: string
  platform: string
  progress: number
  category: string
  rating: number
}

const courses: Course[] = [
  { title: 'System Design Interview', platform: 'Educative', progress: 65, category: 'Engineering', rating: 5 },
  { title: 'Full Stack Open', platform: 'University of Helsinki', progress: 40, category: 'Web Dev', rating: 5 },
  { title: 'The Pragmatic Programmer', platform: 'Book', progress: 80, category: 'Craft', rating: 5 },
  { title: 'AWS Solutions Architect', platform: 'A Cloud Guru', progress: 20, category: 'Cloud', rating: 4 },
]

const notes = [
  { title: 'CAP Theorem', topic: 'System Design', date: 'Jun 30' },
  { title: 'useEffect deep dive', topic: 'React', date: 'Jun 29' },
  { title: 'SOLID principles', topic: 'Craft', date: 'Jun 27' },
  { title: 'TCP vs UDP', topic: 'Networking', date: 'Jun 25' },
]

const categoryColor: Record<string, string> = {
  Engineering: 'bg-blue-500/15 text-blue-400',
  'Web Dev': 'bg-cyan-500/15 text-cyan-400',
  Craft: 'bg-purple-500/15 text-purple-400',
  Cloud: 'bg-amber-500/15 text-amber-400',
}

export default function Learning() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Courses', value: '4' },
          { label: 'Hours this week', value: '14h' },
          { label: 'Notes taken', value: '28' },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card title="Active Courses">
        <div className="space-y-4">
          {courses.map(c => (
            <div key={c.title} className="group">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{c.title}</p>
                    <ExternalLink size={11} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{c.platform}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor[c.category] ?? 'bg-slate-500/15 text-slate-400'}`}>
                    {c.category}
                  </span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={10} className={i < c.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${c.progress}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 font-mono w-8 text-right">{c.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Recent Notes">
        <ul className="space-y-1.5">
          {notes.map(n => (
            <li
              key={n.title}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer group"
            >
              <BookOpen size={14} className="text-slate-600 group-hover:text-accent transition-colors shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200">{n.title}</p>
                <p className="text-xs text-slate-600">{n.topic}</p>
              </div>
              <span className="text-xs text-slate-600">{n.date}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
