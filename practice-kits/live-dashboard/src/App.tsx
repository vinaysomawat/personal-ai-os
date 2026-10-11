import { useEffect, useState } from 'react'
import { Sparkline } from './Sparkline'
import type { Metrics, Range } from './types'

export function App() {
  const [range, setRange] = useState<Range>('1h')
  const [current, setCurrent] = useState<Metrics | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const [polls, setPolls] = useState(0)

  useEffect(() => {
    async function poll() {
      const res = await fetch(`/api/metrics?range=${range}`)
      const m: Metrics = await res.json()
      setCurrent(m)
      setHistory([...history, m.rps].slice(-30))
      setPolls(n => n + 1)
    }
    poll()
    setInterval(poll, 2000)
  }, [range])

  return (
    <main>
      <h1>Service health</h1>
      <div className="toolbar">
        <select value={range} onChange={e => setRange(e.target.value as Range)}>
          <option value="1h">Last hour</option>
          <option value="24h">Last 24 hours</option>
        </select>
        <small>{polls} requests so far</small>
      </div>
      {current && (
        <div className="tiles">
          <div className="tile"><div className="label">Range</div><div className="value">{current.range}</div></div>
          <div className="tile"><div className="label">Active users</div><div className="value">{current.activeUsers.toLocaleString()}</div></div>
          <div className="tile">
            <div className="label">Requests / s</div>
            <div className="value">{current.rps}</div>
            <Sparkline values={history} />
          </div>
          <div className="tile">
            <div className="label">Error rate</div>
            <div className={`value ${current.errorRate > 2 ? 'bad' : 'ok'}`}>●</div>
          </div>
        </div>
      )}
    </main>
  )
}
