/** גודל מקסימלי לתמונה — חייב להתאים לשרת (uploadsController). */
export const MAX_IMAGE_FILE_SIZE = 15 * 1024 * 1024;

export const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.avif',
  '.heic',
  '.heif',
  '.bmp',
  '.tif',
  '.tiff',
];

export const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/bmp',
  'image/tiff',
]);

function fileExtension(name) {
  const base = String(name || '');
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(dot).toLowerCase() : '';
}

export function isAllowedImageFile(file) {
  if (!file) return false;
  const ext = fileExtension(file.name);
  const mime = String(file.type || '').toLowerCase();
  if (ALLOWED_IMAGE_EXTENSIONS.includes(ext)) return true;
  if (ALLOWED_IMAGE_MIMES.has(mime)) return true;
  return false;
}

/** @returns {string | null} הודעת שגיאה בעברית, או null אם תקין */
export function validateImageFile(file) {
  if (!file) return 'קובץ לא תקין';
  if (!isAllowedImageFile(file)) {
    return `סוג קובץ לא נתמך: ${file.name || 'ללא שם'} (jpg, png, webp, heic ועוד)`;
  }
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    const mb = Math.round(MAX_IMAGE_FILE_SIZE / (1024 * 1024));
    return `הקובץ ${file.name} גדול מדי (מקסימום ${mb}MB)`;
  }
  return null;
}

export function partitionImageFiles(files) {
  const accepted = [];
  const rejected = [];
  for (const file of files) {
    const reason = validateImageFile(file);
    if (reason) rejected.push({ file, reason });
    else accepted.push(file);
  }
  return { accepted, rejected };
}

export function formatRejectedFiles(rejected) {
  return rejected.map((r) => r.reason).join('\n');
}
