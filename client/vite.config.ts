import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 24701,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:24700',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:24700',
        ws: true
      }
    }
  }
})
