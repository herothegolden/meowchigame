import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: process.env.PORT || 3000,
    strictPort: false
  },
  preview: {
    host: true,
    port: process.env.PORT || 3000,
    strictPort: false
  },
  build: {
    outDir: 'dist'
  }
})
