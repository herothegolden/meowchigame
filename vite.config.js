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
