import { defineConfig } from 'vite'

export default defineConfig({
  // Serve index.html (opaldo.html) as a plain static file
  // No React plugin needed — it's already compiled inside the HTML
  root: '.',
  server: {
    port: 3000,
    open: true,         // auto-opens browser on start
    host: 'localhost',
  },
  build: {
    outDir: 'dist',
  },
})
