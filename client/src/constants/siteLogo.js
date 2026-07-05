/** מפתח יחיד ללוגו הרשמי של האתר (נאבבר, פוטר, מיילים). */
export const SITE_LOGO_CONTENT_KEY = 'site.logo';

/** מפתחות ישנים — תאימות לאחור אם הלוגו נשמר בעבר במקום אחר */
export const SITE_LOGO_LEGACY_KEYS = ['site.navbar-logo', 'site.brand-logo'];

/** קובץ הלוגו הרשמי ב-public (נאבבר וכו'). */
export const DEFAULT_SITE_LOGO = '/brand-logo.png';

/** לוגו ייעודי לפוטר (רקע כהה). */
export const SITE_FOOTER_LOGO_CONTENT_KEY = 'site.footer-logo';
export const DEFAULT_FOOTER_LOGO = '/brand-logo-footer.png';

/** נתיבי placeholder ישנים — לא משמשים כדריסה אמיתית */
export const DEPRECATED_LOGO_PATHS = ['/logo.svg', '/brand-logo.svg'];

export function isDeprecatedLogoPath(value) {
  const s = String(value || '').trim().toLowerCase();
  if (!s) return true;
  return DEPRECATED_LOGO_PATHS.some((p) => s === p || s.endsWith(p));
}
