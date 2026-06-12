import { useContent } from '../context/ContentContext';

/** מחזיר את כתובת התמונה (דריסה מהשרת או ברירת מחדל). */
export function useEditableImage(id, defaultSrc) {
  const { getOverride } = useContent();
  const override = getOverride(id);
  return override?.text || defaultSrc;
}
