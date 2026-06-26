import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: '../.vite-cache/client',
  server: {
    port: 5173, // Puente del VITE
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true } 
    },
    host: true, // Expone el servidor de Vite a la red local
  }
})
