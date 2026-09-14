import { AlertTriangle, BellRing, CheckCircle2, Link2, MapPin, ShieldCheck, Trash2 } from 'lucide-react';
import { activityTitle, formatDateTime, triggerLabel } from '../utils/format';

function iconFor(entry) {
  if (entry.status === 'error') return AlertTriangle;
  if (entry.type === 'button' || entry.type === 'device') return Link2;
  if (entry.type === 'alert' || entry.type === 'network-alert') return BellRing;
  return CheckCircle2;
}

export default function ActivityScreen({ activities, onClear, t, language }) {
  const alertCount = activities.filter((x) => x.type === 'alert' || x.type === 'network-alert').length;
  const successCount = activities.filter((x) => x.status === 'success' || (x.type === 'trigger' && x.status === 'working')).length;
  const handleClear = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    onClear?.();
  };

  return (
    <div className="screen activity-screen aa-activity-screen">
      <div className="screen-title pro-title activity-pro-title">
        <div>
          <p className="eyebrow dark">{t('activity.eyebrow')}</p>
          <h1>{t('activity.title')}</h1>
          <p>{t('v412.activity.subtitle')}</p>
        </div>
      </div>

      <section className="activity-summary-grid">
        <div className="activity-summary-card">
          <div className="activity-summary-icon blue"><BellRing size={18} /></div>
          <div><small>{t('activity.totalAlerts')}</small><strong>{alertCount}</strong></div>
        </div>
        <div className="activity-summary-card">
          <div className="activity-summary-icon green"><ShieldCheck size={18} /></div>
          <div><small>{t('activity.successful')}</small><strong>{successCount}</strong></div>
        </div>
      </section>

      <div className="v412-activity-tools">
        <span>{t('v412.activity.retention')}</span>
        <button className="v412-clear-activity" type="button" onClick={handleClear} disabled={!activities.length}><Trash2 size={15}/>{t('v412.activity.clearAll')}</button>
      </div>

      <div className="activity-feed">
        {activities.map((entry) => {
          const visualStatus = entry.type === 'trigger' && entry.status === 'working' ? 'success' : entry.status;
          const Icon = iconFor({ ...entry, status: visualStatus });
          const title = activityTitle(entry, language);
          const statusText = visualStatus === 'error' ? t('common.error') : visualStatus === 'working' ? t('common.working') : t('common.completed');
          return (
            <article className={`activity-card ${visualStatus}`} key={entry.id}>
              <div className="activity-card-top">
                <div className="activity-card-icon"><Icon size={18} /></div>
                <div className="activity-card-head">
                  <strong>{title}</strong>
                  <span>{formatDateTime(entry.at, language)}</span>
                </div>
                <div className={`activity-status ${visualStatus}`}>{statusText}</div>
              </div>
              <div className="activity-card-body">
                {entry.trigger && <small className="activity-badge">{triggerLabel(entry.trigger, language)}</small>}
                {entry.location?.mapsUrl && (
                  <a href={entry.location.mapsUrl} target="_blank" rel="noreferrer"><MapPin size={14} /> {t('common.openPosition')}</a>
                )}
                {entry.detail && <p>{entry.detail}</p>}
              </div>
            </article>
          );
        })}

        {!activities.length && (
          <div className="empty-state compact-empty activity-empty-pro">
            <div className="empty-orb"><BellRing size={30} /></div>
            <h2>{t('activity.emptyTitle')}</h2>
            <p>{t('activity.emptyDesc')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
