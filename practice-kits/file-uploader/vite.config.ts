import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Mock upload API (dev server only): reads the body in throttled bursts so
// progress is visible, and rejects bodies over 10 MB with 413.
const LIMIT = 10 * 1024 * 1024

function mockApi(): Plugin {
  return {
    name: 'mock-upload-api',
    configureServer(server) {
      server.middlewares.use('/api/upload', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let size = 0
        req.on('data', (chunk: Buffer) => {
          size += chunk.length
          req.pause()
          setTimeout(() => req.resume(), 30)
        })
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json')
          if (size > LIMIT) {
            res.statusCode = 413
            res.end(JSON.stringify({ error: 'File too large', size }))
            return
          }
          res.end(JSON.stringify({ ok: true, size, name: req.headers['x-file-name'] }))
        })
      })
    },
  }
}

export default defineConfig({ plugins: [react(), mockApi()] })
