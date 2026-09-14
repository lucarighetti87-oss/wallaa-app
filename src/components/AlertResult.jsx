import { Check, Copy, ExternalLink, Mail, MapPin, Radio, X } from 'lucide-react';
import { formatDateTime } from '../utils/format';

export default function AlertResult({ alert, onClose, t, language }) {
  if (!alert) return null;
  const wallaaCount = alert.pushDelivered?.length || 0;
  const emailCount = alert.delivered?.length || 0;
  const totalCount = wallaaCount + emailCount;
  const coords = `${alert.location.latitude.toFixed(5)}, ${alert.location.longitude.toFixed(5)}`;

  async function copyCoords() {
    try { await navigator.clipboard?.writeText(coords); } catch { /* noop */ }
  }

  return (
    <div className="alert-result-backdrop">
      <section className="alert-result alert-result-pro alert-result-ultra">
        <button className="result-close" onClick={onClose} aria-label={t('common.close')}><X size={20} /></button>

        <div className="alert-success-hero">
          <div className="success-orbit orbit-a" /><div className="success-orbit orbit-b" />
          <div className="alert-success-icon"><Check size={38} strokeWidth={3} /></div>
          <span className="alert-success-kicker">WALLAA SAFE BUTTON</span>
          <h2>{t('alert.sent')}</h2>
          <p className="result-headline">{t('alert.headline')}</p>
        </div>

        <div className="alert-delivery-status-grid">
          <div className="delivery-status-chip active"><MapPin size={16} /><span>{t('alert.statusLocation')}</span><b>✓</b></div>
          <div className={`delivery-status-chip ${emailCount ? 'active' : ''}`}><Mail size={16} /><span>{t('alert.statusEmail')}</span><b>{emailCount}</b></div>
          <div className={`delivery-status-chip ${wallaaCount ? 'active' : ''}`}><Radio size={16} /><span>{t('alert.statusWallaa')}</span><b>{wallaaCount}</b></div>
        </div>

        <div className="alert-time-card pro-alert-time">
          <span>{t('common.today')}</span>
          <strong>{formatDateTime(alert.at, language)}</strong>
        </div>

        <div className="location-preview pro-map-card pro-map-card-ultra">
          <div className="map-art">
            <span className="map-grid" /><span className="map-block block-a" /><span className="map-block block-b" /><span className="map-block block-c" />
            <span className="map-road road-a" /><span className="map-road road-b" /><span className="map-road road-c" />
            <span className="map-pin"><MapPin size={25} /></span><span className="map-pulse" />
          </div>
          <div className="location-copy">
            <strong>{t('alert.location')}</strong>
            <div className="coords-row"><span>{coords}</span><button onClick={copyCoords} aria-label={t('alert.copyCoords')}><Copy size={14} /></button></div>
            <small>{t('alert.accuracy', { value: alert.location.accuracy ?? '—' })}</small>
          </div>
        </div>

        <div className="delivery-card delivery-card-pro">
          <span className="delivery-check"><Check size={16} /></span>
          <div>
            <strong>{t(totalCount === 1 ? 'alert.deliveryOne' : 'alert.deliveryMany', { count: totalCount })}</strong>
            <small>{t('alert.deliveryChannels', { email: emailCount, push: wallaaCount })}</small>
          </div>
        </div>

        <a className="primary-action alert-map-button" href={alert.location.mapsUrl} target="_blank" rel="noreferrer">
          <MapPin size={18} /> {t('alert.openMaps')} <ExternalLink size={16} />
        </a>
        <button className="result-back-home" onClick={onClose}>{t('alert.backHome')}</button>
      </section>
    </div>
  );
}
