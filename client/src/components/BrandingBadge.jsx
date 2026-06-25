import { useEffect, useRef, useState } from 'react';
import './styles/BrandingBadge.css';

const LOGO_SRC = '/dl-tech-studio.png';
const VIDEO_SRC = '/branding-video-final.mp4';

function BrandingBadge() {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);

  const close = () => setPlaying(false);

  useEffect(() => {
    if (!playing) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    // הפעלה ללא קול
    const v = videoRef.current;
    if (v) {
      v.muted = true;
      v.currentTime = 0;
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [playing]);

  return (
    <div className="branding-corner">
      <button
        type="button"
        className="branding-badge"
        onClick={() => setPlaying(true)}
        aria-label="נגן את הסרטון של DL TECH STUDIO"
        title="פיתוח ובניית אתרים — DL TECH STUDIO"
      >
        <img src={LOGO_SRC} alt="DL TECH STUDIO" loading="lazy" />
      </button>

      {playing && (
        <div className="branding-video-pop" role="dialog" aria-label="סרטון מצורף">
          <button
            type="button"
            className="branding-video-close"
            onClick={close}
            aria-label="סגירה"
          >
            ×
          </button>
          <video
            ref={videoRef}
            className="branding-video"
            src={VIDEO_SRC}
            autoPlay
            muted
            playsInline
            onEnded={close}
          />
        </div>
      )}
    </div>
  );
}

export default BrandingBadge;
