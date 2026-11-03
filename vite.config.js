import { defineConfig } from 'vite';

// base './' erlaubt den Betrieb unter einem Unterpfad (Reverse Proxy) und in der Windows-App
export default defineConfig({
  base: './',
  clearScreen: false,
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:8080' } },
  build: { target: 'es2021', outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1200 },
});
