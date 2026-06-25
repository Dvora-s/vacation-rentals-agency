import { useEffect } from 'react';
import { useSiteLogo } from '../hooks/useSiteLogo.js';
import { resolveMediaUrl } from '../utils/mediaUrl.js';

/** מעדכן את אייקון הלשונית בדפדפן לפי הלוגו הרשמי באתר. */
function SiteFavicon() {
  const logoSrc = useSiteLogo();

  useEffect(() => {
    const href = resolveMediaUrl(logoSrc);
    if (!href) return;

    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;

    if (/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(href)) {
      link.type = 'image/png';
    } else if (/\.svg(\?|$)/i.test(href)) {
      link.type = 'image/svg+xml';
    }
  }, [logoSrc]);

  return null;
}

export default SiteFavicon;
