import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  configureCloudinary,
  formatCloudinaryUploadError,
  isCloudinaryConfigured,
} from '../config/cloudinary.js';
import { uploadFilesToCloudinary } from '../services/cloudinaryUpload.js';

configureCloudinary();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_EXTENSIONS = [
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

const ALLOWED_MIMES = new Set([
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

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 30;

function extensionAllowed(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

function mimeAllowed(mimetype) {
  const mime = String(mimetype || '').toLowerCase();
  return ALLOWED_MIMES.has(mime);
}

function isAllowedImage(file) {
  return extensionAllowed(file?.originalname) || mimeAllowed(file?.mimetype);
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

const memoryStorage = multer.memoryStorage();

function createUploader() {
  const useCloudinary = isCloudinaryConfigured();
  return multer({
    storage: useCloudinary ? memoryStorage : diskStorage,
    limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES_PER_REQUEST },
    fileFilter: (_req, file, cb) => {
      if (isAllowedImage(file)) cb(null, true);
      else {
        cb(
          new Error(
            'סוג קובץ לא נתמך. ניתן להעלות תמונות בלבד (jpg, png, webp, heic, gif ועוד).',
          ),
        );
      }
    },
  });
}

function localUrls(req, files) {
  const base = `${req.protocol}://${req.get('host')}`;
  return (files || []).map((f) => `${base}/uploads/${f.filename}`);
}

export async function postImages(req, res) {
  const upload = createUploader();

  upload.array('images', MAX_FILES_PER_REQUEST)(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: `הקובץ גדול מדי. גודל מקסימלי: ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`,
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: `ניתן להעלות עד ${MAX_FILES_PER_REQUEST} תמונות בבקשה אחת`,
        });
      }
      return res.status(400).json({ error: err.message });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'לא התקבלו קבצים' });
    }

    try {
      if (isCloudinaryConfigured()) {
        const urls = await uploadFilesToCloudinary(files);
        return res.json({ urls, provider: 'cloudinary' });
      }

      const urls = localUrls(req, files);
      return res.json({ urls, provider: 'local' });
    } catch (uploadErr) {
      console.error('[uploads] Cloudinary upload failed:', uploadErr.message);
      return res.status(502).json({
        error: formatCloudinaryUploadError(uploadErr),
      });
    }
  });
}
