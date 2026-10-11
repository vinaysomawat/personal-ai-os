import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Mock metrics API (dev server only).
//   GET /api/metrics?range=1h|24h          → one snapshot (24h is slow: it aggregates more)
//   GET /api/metrics/stream?range=1h|24h   → Server-Sent Events, one snapshot per second
type Range = '1h' | '24h'

function snapshot(range: Range) {
  const t = Date.now() / 1000
  const scale = range === '24h' ? 24 : 1
  return {
    range,
    ts: new Date().toISOString(),
    activeUsers: Math.round((1200 + 300 * Math.sin(t / 20)) * (range === '24h' ? 9 : 1)),
    rps: Math.round(80 + 40 * Math.sin(t / 7) + 10 * Math.sin(t / 3)),
    errorRate: Math.max(0, +(1.2 + Math.sin(t / 11)).toFixed(2)),
    requests: Math.round(80 * 3600 * scale),
  }
}

function mockApi(): Plugin {
  return {
    name: 'mock-metrics-api',
    configureServer(server) {
      server.middlewares.use('/api/metrics', (req, res) => {
        const url = new URL(req.url ?? '', 'http://x')
        const range = (url.searchParams.get('range') === '24h' ? '24h' : '1h') as Range
        if (url.pathname === '/stream') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
          const send = () => res.write(`data: ${JSON.stringify(snapshot(range))}\n\n`)
          send()
          const timer = setInterval(send, 1000)
          req.on('close', () => clearInterval(timer))
          return
        }
        setTimeout(() => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(snapshot(range)))
        }, range === '24h' ? 900 : 120)
      })
    },
  }
}

export default defineConfig({ plugins: [react(), mockApi()] })
