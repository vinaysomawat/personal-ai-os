import Card from '../components/Card'
import { Flame, Dumbbell, Droplets, Moon } from 'lucide-react'

const streakDays = [true, true, true, true, true, true, false]
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

const metrics = [
  { icon: Dumbbell, label: 'Workout', value: '45 min', sub: 'Upper body', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { icon: Droplets, label: 'Water', value: '2.1 L', sub: '/ 3 L goal', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { icon: Moon, label: 'Sleep', value: '7h 20m', sub: 'Good quality', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { icon: Flame, label: 'Calories', value: '1,840', sub: '/ 2,200 kcal', color: 'text-orange-400', bg: 'bg-orange-500/10' },
]

const workouts = [
  { name: 'Push Day', muscles: 'Chest · Shoulders · Triceps', done: true },
  { name: 'Pull Day', muscles: 'Back · Biceps', done: true },
  { name: 'Leg Day', muscles: 'Quads · Hamstrings · Glutes', done: false },
  { name: 'Cardio', muscles: '30 min zone 2', done: false },
]

const habits = [
  { name: 'Morning walk', streak: 12, done: true },
  { name: 'No sugar', streak: 4, done: true },
  { name: 'Cold shower', streak: 7, done: false },
  { name: 'Read 20 pages', streak: 2, done: true },
  { name: 'No phone after 10pm', streak: 0, done: false },
]

export default function Health() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        {metrics.map(m => (
          <Card key={m.label}>
            <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center mb-3`}>
              <m.icon size={16} className={m.color} />
            </div>
            <p className="text-xl font-bold text-white">{m.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{m.label} · {m.sub}</p>
          </Card>
        ))}
      </div>

      <Card title="Weekly Streak">
        <div className="flex items-center gap-1">
          <Flame size={14} className="text-orange-400 mr-1" />
          <span className="text-sm text-orange-400 font-semibold mr-4">6-day streak</span>
          <div className="flex gap-1.5 flex-1">
            {dayLabels.map((d, i) => (
              <div key={d} className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                  i < streakDays.length && streakDays[i]
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : i === todayIdx
                    ? 'bg-surface-3 text-slate-400 border border-dashed border-slate-600'
                    : 'bg-surface-2 text-slate-600'
                }`}>
                  {i < streakDays.length && streakDays[i] ? '✓' : i > todayIdx ? '·' : '✗'}
                </div>
                <span className={`text-xs ${i === todayIdx ? 'text-white' : 'text-slate-600'}`}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Weekly Workout Plan">
          <ul className="space-y-2">
            {workouts.map(w => (
              <li key={w.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  w.done ? 'bg-green-500 border-green-500' : 'border-surface-3'
                }`}>
                  {w.done && <span className="text-white text-xs">✓</span>}
                </div>
                <div>
                  <p className={`text-sm font-medium ${w.done ? 'text-slate-400 line-through' : 'text-slate-200'}`}>{w.name}</p>
                  <p className="text-xs text-slate-600">{w.muscles}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Daily Habits">
          <ul className="space-y-2">
            {habits.map(h => (
              <li key={h.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  h.done ? 'bg-green-500 border-green-500' : 'border-surface-3'
                }`}>
                  {h.done && <span className="text-white text-xs">✓</span>}
                </div>
                <p className={`flex-1 text-sm ${h.done ? 'text-slate-300' : 'text-slate-400'}`}>{h.name}</p>
                {h.streak > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-orange-400">
                    <Flame size={10} /> {h.streak}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
