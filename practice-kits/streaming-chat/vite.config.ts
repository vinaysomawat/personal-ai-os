import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The chat API runs separately (npm run api, port 3001).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3001' } },
})
