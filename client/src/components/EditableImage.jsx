import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import { uploadImages } from '../services/api';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { useEditableImage } from '../hooks/useEditableImage';
import './styles/EditableImage.css';

/**
 * תמונה ניתנת לעריכה ע"י מנהל.
 *  id              – מפתח ייחודי (חובה)
 *  src             – כתובת ברירת מחדל
 *  mode            – 'img' | 'background'
 *  as              – תגית עוטפת (ברירת מחדל: div לרקע, img לתמונה)
 *  overlayGradient – שכבת gradient לפני url() (לרקע בלבד)
 *  onSave          – שמירה מותאמת (לדוגמה עדכון דירה); אם לא מוגדר — נשמר ב-site_content
 *  onReset         – איפוס מותאם; אם לא מוגדר — נמחק מ-site_content
 */
function EditableImage({
  id,
  src: defaultSrc,
  alt = '',
  className = '',
  mode = 'img',
  as,
  children,
  style,
  overlayGradient,
  onSave,
  onReset,
  imgClassName,
  ...rest
}) {
  const { isAdmin } = useAuth();
  const { saveOverride, resetOverride } = useContent();
  const contentSrc = useEditableImage(id, defaultSrc);
  const resolvedSrc = resolveMediaUrl(onSave ? defaultSrc : contentSrc);

  const [editing, setEditing] = useState(false);
  const [imgSrc, setImgSrc] = useState(resolvedSrc);
  const [draftUrl, setDraftUrl] = useState(resolvedSrc);
  const [imageBroken, setImageBroken] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setImgSrc(resolvedSrc);
    setImageBroken(false);
    if (!editing) setDraftUrl(resolvedSrc);
  }, [resolvedSrc, editing]);

  useEffect(() => {
    if (!editing) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setEditing(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editing]);

  function buildBgImage(url) {
    const safe = url || defaultSrc;
    if (overlayGradient) {
      return `${overlayGradient}, url(${safe})`;
    }
    return `url(${safe})`;
  }

  function openEditor(e) {
    e.preventDefault();
    e.stopPropagation();
    setDraftUrl(resolvedSrc);
    setError(null);
    setEditing(true);
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const urls = await uploadImages(files);
      if (urls[0]) setDraftUrl(urls[0]);
    } catch (err) {
      if (err.partialUrls?.[0]) setDraftUrl(err.partialUrls[0]);
      setError(err.message || 'העלאת התמונה נכשלה');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    const url = draftUrl.trim();
    if (!url) {
      setError('יש להזין כתובת תמונה או להעלות קובץ');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (onSave) {
        await onSave(url);
      } else {
        await saveOverride(id, { text: url, fontSize: null, color: null });
      }
      setEditing(false);
    } catch (err) {
      setError(err.message || 'שמירת התמונה נכשלה');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setError(null);
    try {
      if (onReset) {
        await onReset();
      } else {
        await resetOverride(id);
      }
      setEditing(false);
    } catch (err) {
      setError(err.message || 'איפוס התמונה נכשל');
    } finally {
      setSaving(false);
    }
  }

  const editButton = isAdmin ? (
    <button
      type="button"
      className="editable-image-btn"
      onClick={openEditor}
      aria-label="עריכת תמונה"
      title="עריכת תמונה (מנהל)"
    >
      🖼
    </button>
  ) : null;

  const editorModal =
    editing &&
    createPortal(
      <div
        className="editable-image-editor-overlay"
        role="dialog"
        aria-modal="true"
        onClick={() => setEditing(false)}
      >
        <div className="editable-image-editor" onClick={(e) => e.stopPropagation()} dir="rtl">
          <div className="editable-image-editor-title">עריכת תמונה</div>

          {draftUrl && (
            <img className="editable-image-editor-preview" src={draftUrl} alt="תצוגה מקדימה" />
          )}

          <div
            className={`editable-image-editor-drop${dragOver ? ' drag-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,image/bmp,image/tiff,.heic,.heif"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <span>{uploading ? 'מעלה...' : 'גרור תמונה לכאן או לחץ לבחירה'}</span>
          </div>

          <div className="editable-image-editor-url">
            <label htmlFor={`editable-img-url-${id}`}>או הדבק כתובת URL</label>
            <input
              id={`editable-img-url-${id}`}
              type="url"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="https://..."
              dir="ltr"
            />
          </div>

          {error && <p className="editable-image-editor-error">{error}</p>}

          <div className="editable-image-editor-actions">
            <button
              type="button"
              className="editable-image-editor-save"
              onClick={handleSave}
              disabled={saving || uploading}
            >
              {saving ? 'שומר...' : 'שמירה'}
            </button>
            {(!onSave || onReset) && (
              <button
                type="button"
                className="editable-image-editor-reset"
                onClick={handleReset}
                disabled={saving || uploading}
              >
                איפוס
              </button>
            )}
            <button
              type="button"
              className="editable-image-editor-cancel"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              ביטול
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );

  if (mode === 'background') {
    const Tag = as || 'div';
    const bgStyle = {
      ...style,
      backgroundImage: buildBgImage(resolvedSrc),
    };
    const wrapClass = [
      'editable-image-wrap',
      'editable-image-bg',
      isAdmin ? 'editable-image-admin' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <Tag className={wrapClass} style={bgStyle} {...rest}>
        {children}
        {editButton}
        {editorModal}
      </Tag>
    );
  }

  const imgClass = [
    'editable-image-wrap',
    'editable-image-inline',
    isAdmin ? 'editable-image-admin' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (mode === 'img' && (!imgSrc || imageBroken)) {
    return (
      <span className={imgClass} style={style}>
        <span className="editable-image-missing">אין תמונה</span>
        {editButton}
        {editorModal}
      </span>
    );
  }

  return (
    <span className={imgClass} style={style}>
      <img
        src={imgSrc}
        alt={alt}
        className={imgClassName}
        onError={() => {
          const fallback = resolveMediaUrl(defaultSrc);
          if (fallback && imgSrc !== fallback) {
            setImgSrc(fallback);
            return;
          }
          setImageBroken(true);
        }}
        {...rest}
      />
      {editButton}
      {editorModal}
    </span>
  );
}

export default EditableImage;
export { useEditableImage };
