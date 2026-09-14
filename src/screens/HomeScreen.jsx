import {
  Bluetooth, CheckCircle2, ChevronRight, Info, Mail, MapPin, ShieldCheck, Users
} from 'lucide-react';
import { activityTitle, formatDateTime, triggerShort } from '../utils/format';
import WallaaButtonVisual from '../components/WallaaButtonVisual';
import PremiumHeroVisual from '../components/PremiumHeroVisual';

export default function HomeScreen({
  ready,
  armed,
  setArmed,
  device,
  contacts,
  trigger,
  activities,
  busy,
  onTest,
  onNavigate,
  t,
  language
}) {
  const lastActivity = activities[0];
  const lastTitle = activityTitle(lastActivity, language);

  return (
    <div className="screen home-screen">
      <section className="home-blue-stage" aria-hidden="true">
        <span className="blue-stage-orb orb-a" />
        <span className="blue-stage-orb orb-b" />
        <span className="blue-stage-line line-a" />
        <span className="blue-stage-line line-b" />
      </section>

      <section className="home-premium-intro">
        <div className="home-premium-copy">
          <span className="premium-kicker"><i /> WALLAA PERSONAL SAFETY</span>
          <h1>WHEN SAFETY<br /><em>CAN’T WAIT.</em></h1>
          <p className="press-wallaa-tagline">PRESS WALLAA.</p>
        </div>
        <PremiumHeroVisual connected={Boolean(device)} t={t} />
      </section>

      <section className={`protection-card ${ready ? 'ready' : 'setup'}`}>
        <div className="protection-pattern" />
        <div className="protection-icon">
          <ShieldCheck size={27} strokeWidth={2.5} />
        </div>
        <div className="protection-copy">
          <span>{ready ? t('home.readyTitle') : t('home.setupTitle')}</span>
          <small>{ready ? t('home.readySubtitle') : t('home.setupSubtitle')}</small>
        </div>
        <label className="toggle protection-toggle" aria-label={t('home.activateProtection')}>
          <input type="checkbox" checked={armed} onChange={(e) => setArmed(e.target.checked)} />
          <span />
        </label>
      </section>

      <button className="wallaa-device-card" onClick={() => onNavigate('device')}>
        <div className="device-visual-wrap">
          <WallaaButtonVisual size="sm" connected={Boolean(device)} />
        </div>
        <div className="wallaa-device-copy">
          <strong>Wallaa Button</strong>
          <span className={device ? 'online' : 'offline'}>
            <span className="tiny-status-dot" />
            {device ? t('home.connected') : t('home.toConnect')}
          </span>
        </div>
        <div className="wallaa-device-meta">
          <Bluetooth size={20} />
          <ChevronRight size={18} />
        </div>
      </button>

      <section className="sos-zone">
        <div className="sos-caption">
          <span>{t('home.emergency')}</span>
          <strong>{t('home.testSystem')}</strong>
          <small>{t('home.testDesc')}</small>
        </div>

        <div className="sos-hero">
          <div className="sos-radar radar-1" />
          <div className="sos-radar radar-2" />
          <div className="sos-radar radar-3" />
          <div className="sos-radar radar-4" />
          <button className="sos-main-button" onClick={onTest} disabled={busy}>
            <span className="sos-gloss" />
            <span className="sos-main-inner">
              <strong>{busy ? '…' : 'SOS'}</strong>
              <small>{busy ? t('home.sending') : t('home.testAlert')}</small>
            </span>
          </button>
        </div>
      </section>

      <section className="info-callout">
        <div className="info-callout-icon"><Info size={19} /></div>
        <p>{t('home.info')}</p>
      </section>

      <section className="home-stat-grid">
        <button onClick={() => onNavigate('contacts')} className="home-stat-card">
          <span className="home-stat-icon"><Users size={18} /></span>
          <span><small>{t('home.contacts')}</small><strong>{contacts.length || '0'}</strong></span>
          <ChevronRight size={17} />
        </button>
        <button onClick={() => onNavigate('device')} className="home-stat-card">
          <span className="home-stat-icon"><CheckCircle2 size={18} /></span>
          <span><small>{t('home.sosGesture')}</small><strong>{triggerShort(trigger, language)}</strong></span>
          <ChevronRight size={17} />
        </button>
      </section>

      {lastActivity && (
        <button className="last-event-pro" onClick={() => onNavigate('activity')}>
          <div className="last-event-icon"><MapPin size={18} /></div>
          <div>
            <small>{t('home.lastActivity')}</small>
            <strong>{lastTitle}</strong>
            <span>{formatDateTime(lastActivity.at, language)}</span>
          </div>
          <ChevronRight size={18} />
        </button>
      )}

      <div className="trust-strip">
        <span><MapPin size={15} /> {t('home.location')}</span>
        <span><Mail size={15} /> {t('home.emailAlert')}</span>
        <span><ShieldCheck size={15} /> {t('home.protection')}</span>
      </div>
    </div>
  );
}
