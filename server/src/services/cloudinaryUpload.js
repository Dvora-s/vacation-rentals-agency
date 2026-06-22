import { Readable } from 'node:stream';
import {
  cloudinary,
  getCloudinaryFolder,
  isCloudinaryConfigured,
} from '../config/cloudinary.js';

function uploadBuffer(buffer) {
  const folder = getCloudinaryFolder();

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        unique_filename: true,
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      },
    );

    Readable.from(buffer).pipe(upload);
  });
}

/**
 * מעלה קבצי multer (memoryStorage) ל-Cloudinary.
 * @returns {Promise<string[]>} secure_url לכל קובץ
 */
export async function uploadFilesToCloudinary(files) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured');
  }

  const results = await Promise.all(
    (files || []).map((file) => uploadBuffer(file.buffer)),
  );

  return results.map((r) => r.secure_url).filter(Boolean);
}
