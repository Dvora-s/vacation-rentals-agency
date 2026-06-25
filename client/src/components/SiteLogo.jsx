import EditableImage from './EditableImage';
import { DEFAULT_SITE_LOGO, SITE_LOGO_CONTENT_KEY } from '../constants/siteLogo.js';

/**
 * הלוגו הרשמי של האתר — מקור אחד לנאבבר, פוטר וכל מקום אחר.
 * מנהל עורך פעם אחת; השינוי משתקף בכל האתר.
 */
function SiteLogo({ className = '', imgClassName = '', alt = 'דירות נופש', ...rest }) {
  return (
    <EditableImage
      id={SITE_LOGO_CONTENT_KEY}
      src={DEFAULT_SITE_LOGO}
      alt={alt}
      className={className}
      imgClassName={imgClassName}
      {...rest}
    />
  );
}

export default SiteLogo;
