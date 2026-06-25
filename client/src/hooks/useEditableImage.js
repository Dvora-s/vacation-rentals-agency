import { useContent } from '../context/ContentContext';
import { SITE_LOGO_CONTENT_KEY, SITE_LOGO_LEGACY_KEYS } from '../constants/siteLogo.js';

/** מחזיר את כתובת התמונה (דריסה מהשרת או ברירת מחדל). */
export function useEditableImage(id, defaultSrc) {
  const { getOverride } = useContent();
  const override = getOverride(id);
  if (override?.text?.trim()) return override.text.trim();

  if (id === SITE_LOGO_CONTENT_KEY) {
    for (const key of SITE_LOGO_LEGACY_KEYS) {
      const legacy = getOverride(key)?.text?.trim();
      if (legacy) return legacy;
    }
  }

  return defaultSrc;
}
