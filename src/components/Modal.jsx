import {uiText} from '../uiText';
import { useEffect, useRef } from 'react';
import { ArrowLeft, X } from 'lucide-react';

export default function Modal({ open, title, children, onClose, onBack, className = '' }) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeRef.current?.();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <section className={`modal-card ${className}`.trim()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-handle" />
        <div className="modal-title-row">
          {onBack&&<button className="icon-button" type="button" onClick={onBack} aria-label={uiText('Indietro')}><ArrowLeft size={20}/></button>}
          <h2>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}
