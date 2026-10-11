import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The todo API runs separately (npm run api, port 3002).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3002' } },
})
