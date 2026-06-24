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

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];

function extensionAllowed(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
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
    limits: { fileSize: 8 * 1024 * 1024, files: 20 },
    fileFilter: (_req, file, cb) => {
      if (extensionAllowed(file.originalname)) cb(null, true);
      else {
        cb(
          new Error('סוג קובץ לא נתמך. ניתן להעלות תמונות בלבד (jpg, png, webp, gif).'),
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

  upload.array('images', 20)(req, res, async (err) => {
    if (err) {
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
