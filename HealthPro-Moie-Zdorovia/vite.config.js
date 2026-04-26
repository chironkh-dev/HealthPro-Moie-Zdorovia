import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',  // правильна папка з index.html
  css: {
    devSourcemap: false,
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: true,
    hmr: false,
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    outDir: '../dist',   // dist відносно root → в корені репо
    emptyOutDir: true,
    target: 'es2020',
  },
});
