import { useContent } from '../context/ContentContext';
import {
  DEFAULT_SITE_LOGO,
  SITE_LOGO_CONTENT_KEY,
  SITE_LOGO_LEGACY_KEYS,
} from '../constants/siteLogo.js';

/** כתובת הלוגו הרשמי — site.logo, ואז מפתחות ישנים, ואז ברירת מחדל. */
export function useSiteLogo(defaultSrc = DEFAULT_SITE_LOGO) {
  const { getOverride } = useContent();

  const primary = getOverride(SITE_LOGO_CONTENT_KEY)?.text?.trim();
  if (primary) return primary;

  for (const key of SITE_LOGO_LEGACY_KEYS) {
    const legacy = getOverride(key)?.text?.trim();
    if (legacy) return legacy;
  }

  return defaultSrc;
}
