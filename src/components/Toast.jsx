import { CheckCircle2, CircleAlert, X } from 'lucide-react';

export default function Toast({ toast, onClose, t }) {
  if (!toast) return null;
  const warning = toast.type === 'warning';
  const success = toast.type !== 'error' && !warning;
  const Icon = success ? CheckCircle2 : CircleAlert;
  return (
    <div className={`toast toast-pro ${toast.type || 'success'}`} role="status">
      <div className="toast-accent" />
      <div className="toast-icon-wrap"><Icon size={19} /></div>
      <div className="toast-copy">
        <strong>{success ? t('toast.completed') : t('toast.attention')}</strong>
        <span>{toast.text}</span>
      </div>
      <button onClick={onClose} aria-label={t('common.close')}><X size={17} /></button>
    </div>
  );
}
