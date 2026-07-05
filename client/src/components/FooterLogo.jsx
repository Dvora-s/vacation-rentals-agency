import EditableImage from './EditableImage';
import { DEFAULT_FOOTER_LOGO, SITE_FOOTER_LOGO_CONTENT_KEY } from '../constants/siteLogo.js';

/** לוגו ייעודי לפוטר — נפרד מהלוגו בנאבבר. */
function FooterLogo({ className = '', imgClassName = '', alt = 'דירות נופש', ...rest }) {
  return (
    <EditableImage
      id={SITE_FOOTER_LOGO_CONTENT_KEY}
      src={DEFAULT_FOOTER_LOGO}
      alt={alt}
      className={className}
      imgClassName={imgClassName}
      {...rest}
    />
  );
}

export default FooterLogo;
