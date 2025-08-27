import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { 
    host: true,
    port: 3000
  },
  build: { 
    outDir: 'dist',
    sourcemap: false,
    // Code splitting for faster initial loads
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate game engine from main bundle
          'game': ['./src/GameView.jsx'],
          // Separate UI components  
          'components': ['./src/Home.jsx', './src/Leaderboard.jsx', './src/EnhancedProfileModal.jsx'],
          // Separate audio system
          'audio': ['./src/audio.js']
        }
      }
    },
    // Enable compression
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true
      }
    }
  }
})
