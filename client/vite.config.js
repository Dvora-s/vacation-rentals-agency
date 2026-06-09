import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev-only document CSP so fetch + HMR WebSocket are allowed.
 * (Chrome DevTools’ own `default-src 'none'` console noise is separate; see server well-known route.)
 */
const DEV_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: http: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' http://127.0.0.1:5000 http://localhost:5000 ws://127.0.0.1:3000 ws://localhost:3000 http://127.0.0.1:3000 http://localhost:3000",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join('; ');

export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  server: {
    port: 3000,
    headers:
      command === 'serve' && mode === 'development'
        ? { 'Content-Security-Policy': DEV_CSP }
        : undefined,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
}));
