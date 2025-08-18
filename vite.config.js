import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: true },      // so LAN devices/Telegram Web can hit your dev server
  build: { outDir: 'dist' }    // Express serves this folder in production
})
