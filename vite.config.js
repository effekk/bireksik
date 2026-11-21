import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' → site herhangi bir klasörden de çalışır (önizleme + Vercel)
export default defineConfig({
  plugins: [react()],
  base: './',
})
