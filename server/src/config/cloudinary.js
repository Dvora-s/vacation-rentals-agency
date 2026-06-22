import { v2 as cloudinary } from 'cloudinary';

let configured = false;

/** קורא פעם אחת בעליית השרת — CLOUDINARY_URL או שלושה משתנים נפרדים. */
export function configureCloudinary() {
  if (configured) return isCloudinaryConfigured();

  const url = process.env.CLOUDINARY_URL?.trim();
  if (url) {
    const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/?#]+)/i);
    if (match) {
      cloudinary.config({
        api_key: decodeURIComponent(match[1]),
        api_secret: decodeURIComponent(match[2]),
        cloud_name: decodeURIComponent(match[3]),
        secure: true,
      });
      configured = true;
      return true;
    }
    console.warn('[uploads] CLOUDINARY_URL is set but could not be parsed');
  }

  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (cloud_name && api_key && api_secret) {
    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
    configured = true;
    return true;
  }

  configured = true;
  return false;
}

export function isCloudinaryConfigured() {
  const c = cloudinary.config();
  return Boolean(c.cloud_name && c.api_key && c.api_secret);
}

export function getCloudinaryFolder() {
  return process.env.CLOUDINARY_FOLDER?.trim() || 'dirotnofesh/apartments';
}

export function getUploadProvider() {
  return isCloudinaryConfigured() ? 'cloudinary' : 'local';
}

/** ל-/api/health — בלי לחשוף סודות */
export function getCloudinaryDiagnostics() {
  const c = cloudinary.config();
  const hasUrl = Boolean(process.env.CLOUDINARY_URL?.trim());
  const hasParts = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );

  return {
    provider: getUploadProvider(),
    configured: isCloudinaryConfigured(),
    cloud_name: c.cloud_name || null,
    folder: getCloudinaryFolder(),
    config_source: hasUrl ? 'CLOUDINARY_URL' : hasParts ? 'CLOUDINARY_*' : 'none',
  };
}

export function logCloudinaryStartup() {
  const d = getCloudinaryDiagnostics();
  if (d.configured) {
    console.info(
      `[uploads] Cloudinary ready: cloud=${d.cloud_name} folder=${d.folder}`,
    );
    return;
  }
  console.warn(
    '[uploads] Cloudinary not configured — images saved to local disk (lost on Railway redeploy). Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET on Railway.',
  );
}

export { cloudinary };
