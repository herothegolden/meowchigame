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
          'components': ['./src/Home.jsx', './src/Leaderboard.jsx', './src/DailyTasks.jsx'],
          // Separate modals and heavy components
          'modals': ['./src/EnhancedProfileModal.jsx', './src/SquadModal.jsx'],
          // Separate utility files
          'utils': ['./src/utils.js', './src/store.js'],
          // Separate audio system
          'audio': ['./src/audio.js'],
          // Separate React vendor code
          'react-vendor': ['react', 'react-dom'],
          // Separate other vendor libraries
          'vendor': ['zustand']
        }
      }
    },
    // Enable compression and optimization (using esbuild - faster than terser)
    minify: 'esbuild',
    esbuild: {
      drop: ['console', 'debugger'], // Remove console.logs in production
      legalComments: 'none'
    },
    // Optimize chunk sizes
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset handling
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    // Enable preload for important chunks
    modulePreload: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand'],
    exclude: ['@telegram-apps/init-data-node']
  },
  // Enable CSS optimization
  css: {
    preprocessorOptions: {
      css: {
        charset: false
      }
    }
  }
})
