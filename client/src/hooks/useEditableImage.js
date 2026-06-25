import { useContent } from '../context/ContentContext';
import {
  DEFAULT_SITE_LOGO,
  SITE_LOGO_CONTENT_KEY,
  SITE_LOGO_LEGACY_KEYS,
  isDeprecatedLogoPath,
} from '../constants/siteLogo.js';

function resolveLogoOverride(getOverride, key) {
  const value = getOverride(key)?.text?.trim();
  if (!value || isDeprecatedLogoPath(value)) return null;
  return value;
}

/** מחזיר את כתובת התמונה (דריסה מהשרת או ברירת מחדל). */
export function useEditableImage(id, defaultSrc) {
  const { getOverride } = useContent();
  const override = resolveLogoOverride(getOverride, id);
  if (override) return override;

  if (id === SITE_LOGO_CONTENT_KEY) {
    for (const key of SITE_LOGO_LEGACY_KEYS) {
      const legacy = resolveLogoOverride(getOverride, key);
      if (legacy) return legacy;
    }
  }

  return defaultSrc;
}
