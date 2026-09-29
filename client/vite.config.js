import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// API_PORT lets the dev proxy point at a different port when 5000 is taken.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': `http://localhost:${process.env.API_PORT || 5000}` },
  },
})
