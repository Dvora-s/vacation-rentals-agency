import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './styles/ImageLightbox.css';

function ImageLightbox({ images, index, onIndexChange, onClose, alt = '' }) {
  const total = images.length;
  const hasMultiple = total > 1;

  const goPrev = useCallback(() => {
    if (!hasMultiple) return;
    onIndexChange((index - 1 + total) % total);
  }, [hasMultiple, index, onIndexChange, total]);

  const goNext = useCallback(() => {
    if (!hasMultiple) return;
    onIndexChange((index + 1) % total);
  }, [hasMultiple, index, onIndexChange, total]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [goNext, goPrev, onClose]);

  if (!images[index]) return null;

  return createPortal(
    <div
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="תצוגת תמונה מוגדלת"
      onClick={onClose}
    >
      <div className="image-lightbox__toolbar">
        <span className="image-lightbox__counter">
          {index + 1} / {total}
        </span>
        <button type="button" className="image-lightbox__close" onClick={onClose} aria-label="סגירה">
          ×
        </button>
      </div>

      {hasMultiple && (
        <button
          type="button"
          className="image-lightbox__nav image-lightbox__nav--prev"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="תמונה קודמת"
        >
          ‹
        </button>
      )}

      <div className="image-lightbox__stage" onClick={(e) => e.stopPropagation()}>
        <img
          className="image-lightbox__img"
          src={images[index]}
          alt={alt}
          draggable={false}
        />
      </div>

      {hasMultiple && (
        <button
          type="button"
          className="image-lightbox__nav image-lightbox__nav--next"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="תמונה הבאה"
        >
          ›
        </button>
      )}

      <p className="image-lightbox__hint">חצים ימין/שמאל לניווט · Esc לסגירה</p>
    </div>,
    document.body,
  );
}

export default ImageLightbox;
