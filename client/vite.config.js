import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev-only document CSP so fetch + HMR WebSocket are allowed.
 * (Chrome DevTools’ own `default-src 'none'` console noise is separate; see server well-known route.)
 */
const PAYPAL_SRC = 'https://www.paypal.com https://*.paypal.com https://*.paypalobjects.com';
/** API בפיתוח — פרוקסי מקומי או Railway ישיר */
const DEV_API_CONNECT =
  'https://vacation-rentals-agency-production.up.railway.app https://*.up.railway.app';
/** Google Fonts (CSS מ־fonts.googleapis.com, קבצי גופן מ־fonts.gstatic.com) */
const GOOGLE_FONTS = 'https://fonts.googleapis.com https://fonts.gstatic.com';
const DEV_CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${PAYPAL_SRC}`,
  `style-src 'self' 'unsafe-inline' ${GOOGLE_FONTS}`,
  "img-src 'self' data: blob: http: https:",
  `font-src 'self' data: https: ${GOOGLE_FONTS}`,
  `connect-src 'self' http://127.0.0.1:5000 http://localhost:5000 ws://127.0.0.1:3000 ws://localhost:3000 http://127.0.0.1:3000 http://localhost:3000 ${DEV_API_CONNECT} ${PAYPAL_SRC}`,
  `frame-src 'self' ${PAYPAL_SRC}`,
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join('; ');

export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  server: {
    port: 3000,
    /** אם 3000 תפוס — לא לעבור ל־3001 בשקט (זה שובר proxy/CSP/HMR). סגרי תהליך על 3000 או שנה פורט במפורש. */
    strictPort: true,
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
