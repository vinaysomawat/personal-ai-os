import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { CITIES } from './src/cities'

// Mock search API (dev server only). Latency is deliberately realistic and
// uneven: short, broad queries are slow (more results to rank), longer ones
// are fast — so responses can arrive out of order.
function mockApi(): Plugin {
  return {
    name: 'mock-search-api',
    configureServer(server) {
      server.middlewares.use('/api/search', (req, res) => {
        const q = new URL(req.url ?? '', 'http://x').searchParams.get('q')?.toLowerCase() ?? ''
        const results = CITIES.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8)
        const latency = Math.max(80, 900 - q.length * 200)
        setTimeout(() => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ query: q, results }))
        }, latency)
      })
    },
  }
}

export default defineConfig({ plugins: [react(), mockApi()] })
