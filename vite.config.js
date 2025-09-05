import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // --- THIS IS THE CRITICAL FIX ---
  // This proxy automatically forwards all frontend requests starting with "/api"
  // to your backend server running on port 3000 during development.
  // This avoids CORS issues and removes the need to hardcode URLs in your code.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Your local backend server
        changeOrigin: true,
      },
    },
  },
})
