import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureSiteContentTable, selectAllSiteContent } from '../models/siteContentModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_LOGO_PATH = path.join(__dirname, '..', '..', '..', 'client', 'public', 'brand-logo.svg');

const LOGO_KEYS = ['site.logo', 'site.navbar-logo', 'site.brand-logo'];

const APP_URL = (
  process.env.APP_URL ||
  process.env.CLIENT_ORIGIN ||
  'https://dirotnofesh.co.il'
).replace(/\/$/, '');

const API_ORIGIN = (
  process.env.API_PUBLIC_URL ||
  process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${String(process.env.RAILWAY_PUBLIC_DOMAIN).replace(/^https?:\/\//, '')}`
    : 'https://vacation-rentals-agency-production.up.railway.app'
).replace(/\/$/, '');

export async function resolveSiteLogoStoredValue() {
  await ensureSiteContentTable();
  const rows = await selectAllSiteContent();
  const byKey = new Map(rows.map((r) => [r.content_key, String(r.body || '').trim()]));
  for (const key of LOGO_KEYS) {
    const value = byKey.get(key);
    if (value) return value;
  }
  return '/brand-logo.svg';
}

export function toPublicLogoUrl(stored) {
  const s = String(stored || '').trim();
  if (!s) return `${APP_URL}/brand-logo.svg`;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/uploads/')) return `${API_ORIGIN}${s}`;
  if (s.startsWith('/')) return `${APP_URL}${s}`;
  return `${APP_URL}/${s}`;
}

function detectImageMime(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  const head = buf.slice(0, 200).toString('utf8').trimStart();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'image/svg+xml';
  return 'application/octet-stream';
}

function filenameForMime(mime) {
  if (mime === 'image/png') return 'logo.png';
  if (mime === 'image/jpeg') return 'logo.jpg';
  if (mime === 'image/svg+xml') return 'logo.svg';
  return 'logo.bin';
}

/** טוען את קובץ הלוגו לצירוף במייל (SMTP) או ל-URL ציבורי (Resend). */
export async function loadSiteLogoForEmail() {
  const stored = await resolveSiteLogoStoredValue();
  const publicUrl = toPublicLogoUrl(stored);

  if (stored === '/brand-logo.svg' || stored.endsWith('/brand-logo.svg') || stored === '/logo.svg' || stored.endsWith('/logo.svg')) {
    try {
      const content = fs.readFileSync(DEFAULT_LOGO_PATH);
      const mime = detectImageMime(content);
      return { publicUrl: `${APP_URL}/brand-logo.svg`, content, mime, filename: filenameForMime(mime) };
    } catch {
      /* fall through to fetch */
    }
  }

  if (/^https?:\/\//i.test(stored)) {
    try {
      const res = await fetch(stored);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        const content = Buffer.from(ab);
        const mime = res.headers.get('content-type')?.split(';')[0]?.trim() || detectImageMime(content);
        return { publicUrl: stored, content, mime, filename: filenameForMime(mime) };
      }
    } catch (err) {
      console.warn('[mailer] לא ניתן להוריד לוגו מ-URL:', err.message);
    }
  }

  if (stored.startsWith('/uploads/')) {
    const localPath = path.join(__dirname, '..', '..', stored.replace(/^\//, ''));
    try {
      const content = fs.readFileSync(localPath);
      const mime = detectImageMime(content);
      return { publicUrl, content, mime, filename: filenameForMime(mime) };
    } catch {
      try {
        const res = await fetch(publicUrl);
        if (res.ok) {
          const content = Buffer.from(await res.arrayBuffer());
          const mime = detectImageMime(content);
          return { publicUrl, content, mime, filename: filenameForMime(mime) };
        }
      } catch (err) {
        console.warn('[mailer] לא ניתן לטעון לוגו מ-uploads:', err.message);
      }
    }
  }

  return { publicUrl, content: null, mime: null, filename: 'logo.svg' };
}
