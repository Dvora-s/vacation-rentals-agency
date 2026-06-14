import { useCallback } from 'react';
import './styles/RangeSlider.css';

// סליידר טווח עם שתי ידיות (מינימום/מקסימום).
// value: { min, max } · onChange מקבל { min, max }.
function RangeSlider({ label, min = 0, max = 100, step = 1, value, onChange, format }) {
  const current = {
    min: value?.min ?? min,
    max: value?.max ?? max,
  };

  const fmt = useCallback((v) => (format ? format(v) : `${v}`), [format]);

  const range = max - min || 1;
  const leftPct = ((current.min - min) / range) * 100;
  const rightPct = ((max - current.max) / range) * 100;

  function handleMin(e) {
    const next = Math.min(Number(e.target.value), current.max);
    onChange?.({ ...current, min: next });
  }

  function handleMax(e) {
    const next = Math.max(Number(e.target.value), current.min);
    onChange?.({ ...current, max: next });
  }

  return (
    <div className="range-slider">
      {label && <p className="range-slider-label">{label}</p>}

      <div className="range-slider-values">
        <span>{fmt(current.min)}</span>
        <span>{fmt(current.max)}</span>
      </div>

      <div className="range-slider-track">
        <div className="range-slider-rail" />
        <div
          className="range-slider-fill"
          style={{ insetInlineStart: `${leftPct}%`, insetInlineEnd: `${rightPct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={current.min}
          onChange={handleMin}
          aria-label={`${label || ''} - מינימום`}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={current.max}
          onChange={handleMax}
          aria-label={`${label || ''} - מקסימום`}
        />
      </div>
    </div>
  );
}

export default RangeSlider;
