import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import './styles/EditableText.css';

const MIN_SIZE = 10;
const MAX_SIZE = 80;
const DEFAULT_PICKER_COLOR = '#1a2b4a';

function parsePx(value) {
  if (!value) return null;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

/**
 * בלוק טקסט ניתן-לעריכה ע"י מנהל.
 *  id        – מפתח ייחודי לתוכן (חובה)
 *  as        – שם תגית (ברירת מחדל: span)
 *  children  – טקסט ברירת המחדל (מהקוד)
 */
function EditableText({ id, domId, as = 'span', children, className = '', style, ...rest }) {
  const { isAdmin } = useAuth();
  const { getOverride, saveOverride, resetOverride } = useContent();

  const override = getOverride(id);
  const defaultText = typeof children === 'string' ? children : '';
  const text = override && override.text != null ? override.text : defaultText;
  const fontSize = override?.fontSize || null;
  const color = override?.color || null;

  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(text);
  const [draftSize, setDraftSize] = useState(parsePx(fontSize));
  const [draftColor, setDraftColor] = useState(color);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setEditing(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editing]);

  const Tag = as;
  const mergedStyle = {
    ...style,
    ...(fontSize ? { fontSize } : {}),
    ...(color ? { color } : {}),
  };

  function openEditor(e) {
    e.preventDefault();
    e.stopPropagation();
    setDraftText(text);
    setDraftSize(parsePx(fontSize));
    setDraftColor(color);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveOverride(id, {
        text: draftText,
        fontSize: draftSize ? `${draftSize}px` : null,
        color: draftColor || null,
      });
      setEditing(false);
    } catch (err) {
      window.alert(err?.message || 'שמירת הטקסט נכשלה');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      await resetOverride(id);
      setEditing(false);
    } catch (err) {
      window.alert(err?.message || 'איפוס הטקסט נכשל');
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <Tag id={domId} className={className} style={mergedStyle} {...rest}>
        {text}
      </Tag>
    );
  }

  return (
    <Tag id={domId} className={`${className} editable-text`.trim()} style={mergedStyle} {...rest}>
      {text}
      <button
        type="button"
        className="editable-text-btn"
        onClick={openEditor}
        aria-label="עריכת טקסט"
        title="עריכת טקסט (מנהל)"
        contentEditable={false}
      >
        ✎
      </button>

      {editing &&
        createPortal(
          <div
            className="editable-editor-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => setEditing(false)}
          >
            <div className="editable-editor" onClick={(e) => e.stopPropagation()} dir="rtl">
              <div className="editable-editor-title">עריכת טקסט</div>

              <textarea
                className="editable-editor-textarea"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={Math.min(8, Math.max(2, String(draftText).split('\n').length + 1))}
                autoFocus
              />

              <div className="editable-editor-size">
                <div className="editable-editor-size-head">
                  <span>גודל גופן</span>
                  <span className="editable-editor-size-value">
                    {draftSize ? `${draftSize}px` : 'ברירת מחדל'}
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_SIZE}
                  max={MAX_SIZE}
                  step={1}
                  value={draftSize || 18}
                  onChange={(e) => setDraftSize(Number(e.target.value))}
                />
                {draftSize != null && (
                  <button
                    type="button"
                    className="editable-editor-link-btn"
                    onClick={() => setDraftSize(null)}
                  >
                    החזר לגודל ברירת המחדל
                  </button>
                )}
              </div>

              <div className="editable-editor-color">
                <div className="editable-editor-size-head">
                  <span>צבע גופן</span>
                  <span className="editable-editor-size-value">
                    {draftColor || 'ברירת מחדל'}
                  </span>
                </div>
                <div className="editable-editor-color-row">
                  <input
                    type="color"
                    className="editable-editor-color-input"
                    value={draftColor || DEFAULT_PICKER_COLOR}
                    onChange={(e) => setDraftColor(e.target.value)}
                    aria-label="בחירת צבע גופן"
                  />
                  {draftColor != null && (
                    <button
                      type="button"
                      className="editable-editor-link-btn"
                      onClick={() => setDraftColor(null)}
                    >
                      החזר לצבע ברירת המחדל
                    </button>
                  )}
                </div>
              </div>

              <div className="editable-editor-actions">
                <button
                  type="button"
                  className="editable-editor-save"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'שומר...' : 'שמירה'}
                </button>
                <button
                  type="button"
                  className="editable-editor-reset"
                  onClick={handleReset}
                  disabled={saving}
                >
                  איפוס
                </button>
                <button
                  type="button"
                  className="editable-editor-cancel"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </Tag>
  );
}

export default EditableText;
