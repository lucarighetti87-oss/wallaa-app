import { useCallback, useEffect, useRef, useState } from 'react';
import { impact } from '../services/nativeFeedback';

function haptic(kind = 'light') { impact(kind); }

export default function HoldToConfirmButton({
  className = '',
  duration = 1600,
  disabled = false,
  onConfirm,
  children,
  ariaLabel,
  hapticSteps = true
}) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(0);
  const startRef = useRef(0);
  const confirmedRef = useRef(false);
  const stepRef = useRef(0);

  const stop = useCallback((reset = true) => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    startRef.current = 0;
    stepRef.current = 0;
    setHolding(false);
    if (reset && !confirmedRef.current) setProgress(0);
  }, []);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const begin = useCallback((event) => {
    if (disabled || confirmedRef.current) return;
    event?.preventDefault?.();
    try { event?.currentTarget?.setPointerCapture?.(event.pointerId); } catch { /* noop */ }
    confirmedRef.current = false;
    startRef.current = performance.now();
    stepRef.current = 0;
    setHolding(true);
    setProgress(0);
    haptic('light');

    const tick = async (now) => {
      const elapsed = Math.max(0, now - startRef.current);
      const next = Math.min(1, elapsed / duration);
      setProgress(next);

      if (hapticSteps) {
        const step = Math.floor(next * 4);
        if (step > stepRef.current && step < 4) {
          stepRef.current = step;
          haptic(step >= 3 ? 'medium' : 'light');
        }
      }

      if (next >= 1) {
        confirmedRef.current = true;
        setHolding(false);
        haptic('heavy');
        try { await onConfirm?.(); } finally {
          window.setTimeout(() => {
            confirmedRef.current = false;
            setProgress(0);
          }, 300);
        }
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [disabled, duration, hapticSteps, onConfirm]);

  const release = useCallback((event) => {
    event?.preventDefault?.();
    if (!confirmedRef.current) stop(true);
  }, [stop]);

  return (
    <button
      type="button"
      className={`${className} hold-confirm${holding ? ' is-holding' : ''}`.trim()}
      style={{ '--hold-progress': `${Math.round(progress * 100)}%` }}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-busy={holding || undefined}
      onPointerDown={begin}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) begin(e);
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') release(e);
      }}
    >
      {children}
      <span className="hold-confirm-progress" aria-hidden="true" />
    </button>
  );
}
