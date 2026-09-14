import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, title, children, onClose, className = '' }) {
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
          <h2>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}
