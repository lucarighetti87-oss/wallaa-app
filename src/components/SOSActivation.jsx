import { useCallback, useEffect, useRef, useState } from 'react';
import { impact } from '../services/nativeFeedback';

const HOLD_MS = 3000;
const STEP_MS = 1000;
const PROGRESS_INTERVAL_MS = 50;

function haptic(kind = 'light') { impact(kind); }

export default function SOSActivation({ open, onCancel, onConfirm, busy, t }) {
  const [count, setCount] = useState(3);
  const [progress, setProgress] = useState(0);
  const timersRef = useRef([]);
  const startedAtRef = useRef(0);
  const firedRef = useRef(false);
  const confirmRef = useRef(onConfirm);

  useEffect(() => { confirmRef.current = onConfirm; }, [onConfirm]);

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) {
      if (timer.type === 'interval') window.clearInterval(timer.id);
      else window.clearTimeout(timer.id);
    }
    timersRef.current = [];
  }, []);

  const cancelHold = useCallback(() => {
    if (!open || firedRef.current || busy) return;
    clearTimers();
    onCancel?.();
  }, [busy, clearTimers, onCancel, open]);

  useEffect(() => {
    if (!open) {
      clearTimers();
      firedRef.current = false;
      setCount(3);
      setProgress(0);
      return undefined;
    }

    clearTimers();
    firedRef.current = false;
    startedAtRef.current = Date.now();
    setCount(3);
    setProgress(0);
    haptic('light');

    const addTimeout = (fn, delay) => {
      const id = window.setTimeout(fn, delay);
      timersRef.current.push({ type: 'timeout', id });
      return id;
    };

    const progressId = window.setInterval(() => {
      const elapsed = Math.max(0, Date.now() - startedAtRef.current);
      setProgress(Math.min(1, elapsed / HOLD_MS));
    }, PROGRESS_INTERVAL_MS);
    timersRef.current.push({ type: 'interval', id: progressId });

    addTimeout(() => {
      if (firedRef.current) return;
      setCount(2);
      haptic('light');
    }, STEP_MS);

    addTimeout(() => {
      if (firedRef.current) return;
      setCount(1);
      haptic('medium');
    }, STEP_MS * 2);

    addTimeout(async () => {
      if (firedRef.current) return;
      firedRef.current = true;
      setProgress(1);
      haptic('heavy');
      clearTimers();
      try {
        await confirmRef.current?.();
      } catch {
        // The parent owns user-facing errors; never leave the countdown locked.
      }
    }, HOLD_MS);

    return clearTimers;
  }, [clearTimers, open]);

  if (!open) return null;

  return (
    <div
      className="sos-activation-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('v4.sos.dialogAria')}
      style={{ '--sos-hold-progress': `${Math.round(progress * 100)}%` }}
    >
      <div className="sos-activation-header">
        <span>{t('v4.sos.activating')}</span>
        <small>{t('v4.sos.keepHolding')}</small>
      </div>
      <div className="sos-activation-target" aria-hidden="true">
        <i className="activation-wave w1" /><i className="activation-wave w2" /><i className="activation-wave w3" />
        <div className="activation-sos">SOS</div>
      </div>
      <div className="activation-counter" aria-live="polite"><span>{busy ? '…' : count}</span></div>
      <p className="activation-instruction">{t('v4.sos.releaseCancel')}</p>
      <button className="activation-cancel" type="button" onClick={cancelHold} disabled={busy}>{t('v4.sos.cancel')}</button>
    </div>
  );
}
