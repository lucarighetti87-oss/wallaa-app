import { CheckCircle2, MapPin, RadioTower, Send, ShieldAlert } from 'lucide-react';

const steps = [
  { id: 'sending', icon: Send, label: 'v407.dispatch.sending' },
  { id: 'location', icon: MapPin, label: 'v407.dispatch.location' },
  { id: 'guardians', icon: RadioTower, label: 'v407.dispatch.guardians' }
];

const order = { idle: -1, sending: 0, location: 1, guardians: 2, complete: 3 };

export default function EmergencyDispatchOverlay({ open, stage = 'sending', t }) {
  if (!open) return null;
  const current = order[stage] ?? 0;
  const complete = stage === 'complete';
  return (
    <div className="emergency-dispatch-overlay" role="status" aria-live="assertive">
      <div className={`emergency-dispatch-radar${complete ? ' complete' : ''}`} aria-hidden="true">
        <i/><i/><i/>
        <div>{complete ? <CheckCircle2 size={36}/> : <ShieldAlert size={34}/>}</div>
      </div>
      <span className="emergency-dispatch-kicker">WALLAA ACTIVE ALERT</span>
      <h1>{complete ? t('v408.dispatch.completeTitle') : t('v407.dispatch.title')}</h1>
      <p>{complete ? t('v408.dispatch.completeBody') : t('v407.dispatch.body')}</p>
      <div className="emergency-dispatch-steps">
        {steps.map((item, index) => {
          const Icon = item.icon;
          const done = complete || index < current;
          const active = !complete && index === current;
          return (
            <div key={item.id} className={`${done ? 'done' : ''}${active ? ' active' : ''}`}>
              {done ? <CheckCircle2 size={18}/> : <Icon size={17}/>}<span>{t(item.label)}</span>{active ? <b/> : null}
            </div>
          );
        })}
      </div>
      <small>{complete ? t('v408.dispatch.completeHint') : t('v407.dispatch.keepOpen')}</small>
    </div>
  );
}
