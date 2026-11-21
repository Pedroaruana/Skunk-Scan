import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base relativa: o site fica em pedroaruana.github.io/Skunk-Scan/, nao na raiz do dominio
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: { include: ['test/**/*.test.ts'] },
})
