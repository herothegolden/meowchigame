import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 3000
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 3000,
    allowedHosts: [
      'meowchigame-production.up.railway.app',
      '.railway.app',
      'localhost',
      '127.0.0.1'
    ]
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
