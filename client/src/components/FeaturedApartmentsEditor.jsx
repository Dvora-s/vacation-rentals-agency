import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import { getApartments } from '../services/api';
import { getApartmentCoverUrl } from '../utils/mediaUrl';
import {
  FEATURED_APARTMENTS_CONTENT_KEY,
  FEATURED_APARTMENTS_LIMIT,
  parseFeaturedApartmentIds,
} from '../constants/featuredApartments';
import './styles/FeaturedApartmentsEditor.css';

function FeaturedApartmentsEditor({ onSaved }) {
  const { isAdmin } = useAuth();
  const { getOverride, saveOverride, resetOverride } = useContent();
  const [open, setOpen] = useState(false);
  const [allApartments, setAllApartments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    if (!open || !isAdmin) return undefined;
    let active = true;
    setLoading(true);
    setError(null);

    const stored = getOverride(FEATURED_APARTMENTS_CONTENT_KEY)?.text;
    setSelectedIds(parseFeaturedApartmentIds(stored));

    getApartments()
      .then((rows) => {
        if (active) setAllApartments(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'טעינת הדירות נכשלה');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, isAdmin, getOverride]);

  function toggleApartment(id) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= FEATURED_APARTMENTS_LIMIT) return prev;
      return [...prev, id];
    });
  }

  function moveApartment(id, direction) {
    setSelectedIds((prev) => {
      const index = prev.indexOf(id);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveOverride(FEATURED_APARTMENTS_CONTENT_KEY, {
        text: JSON.stringify(selectedIds),
        fontSize: null,
        color: null,
      });
      onSaved?.();
      setOpen(false);
    } catch (err) {
      setError(err.message || 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setError(null);
    try {
      await resetOverride(FEATURED_APARTMENTS_CONTENT_KEY);
      setSelectedIds([]);
      onSaved?.();
      setOpen(false);
    } catch (err) {
      setError(err.message || 'איפוס נכשל');
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) return null;

  const selectedApartments = selectedIds
    .map((id) => allApartments.find((apt) => apt.id === id))
    .filter(Boolean);

  const modal = open
    ? createPortal(
        <div className="featured-editor-backdrop" onClick={() => !saving && setOpen(false)}>
          <div
            className="featured-editor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="featured-editor-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="featured-editor-head">
              <h3 id="featured-editor-title">בחירת נכסים מומלצים לעמוד הבית</h3>
              <p>
                בחרו עד {FEATURED_APARTMENTS_LIMIT} דירות שיוצגו תחת &quot;נכסים מומלצים&quot;.
                סדר הבחירה קובע את סדר התצוגה.
              </p>
            </div>

            {loading && <p className="featured-editor-loading">טוען דירות...</p>}
            {error && <p className="featured-editor-error">{error}</p>}

            {!loading && (
              <>
                {selectedApartments.length > 0 && (
                  <div className="featured-editor-selected">
                    <h4>נבחרו ({selectedApartments.length}/{FEATURED_APARTMENTS_LIMIT})</h4>
                    <ul>
                      {selectedApartments.map((apt, index) => (
                        <li key={apt.id}>
                          <span className="featured-editor-order">{index + 1}</span>
                          <span className="featured-editor-title">{apt.title}</span>
                          <div className="featured-editor-order-actions">
                            <button
                              type="button"
                              onClick={() => moveApartment(apt.id, -1)}
                              disabled={index === 0 || saving}
                              aria-label="הזז למעלה"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveApartment(apt.id, 1)}
                              disabled={index === selectedApartments.length - 1 || saving}
                              aria-label="הזז למטה"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="featured-editor-remove"
                              onClick={() => toggleApartment(apt.id)}
                              disabled={saving}
                            >
                              הסר
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="featured-editor-list">
                  <h4>כל הדירות הפעילות באתר</h4>
                  {allApartments.length === 0 ? (
                    <p className="featured-editor-empty">אין דירות פעילות לבחירה.</p>
                  ) : (
                    <ul>
                      {allApartments.map((apt) => {
                        const checked = selectedSet.has(apt.id);
                        const disabled =
                          saving || (!checked && selectedIds.length >= FEATURED_APARTMENTS_LIMIT);
                        const cover = getApartmentCoverUrl(apt);
                        return (
                          <li key={apt.id}>
                            <label className={`featured-editor-item ${checked ? 'is-selected' : ''}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => toggleApartment(apt.id)}
                              />
                              <span className="featured-editor-thumb">
                                {cover ? (
                                  <img src={cover} alt="" />
                                ) : (
                                  <span className="featured-editor-thumb-empty">אין תמונה</span>
                                )}
                              </span>
                              <span className="featured-editor-item-body">
                                <strong>{apt.title}</strong>
                                <span>{apt.location}</span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}

            <div className="featured-editor-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || loading}
              >
                {saving ? 'שומר...' : 'שמירה'}
              </button>
              <button
                type="button"
                className="btn-outline-gold"
                onClick={handleReset}
                disabled={saving || loading}
              >
                איפוס (אוטומטי)
              </button>
              <button
                type="button"
                className="featured-editor-cancel"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        type="button"
        className="featured-edit-btn"
        onClick={() => setOpen(true)}
        aria-label="בחירת נכסים מומלצים לעמוד הבית"
      >
        בחירת דירות מומלצות
      </button>
      {modal}
    </>
  );
}

export default FeaturedApartmentsEditor;
