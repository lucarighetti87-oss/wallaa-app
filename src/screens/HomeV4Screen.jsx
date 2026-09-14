import { useRef, useState } from 'react';
import {
  BatteryMedium,
  ChevronRight,
  MapPin,
  Navigation,
  QrCode,
  Shield,
  Users
} from 'lucide-react';

export default function HomeV4Screen({
  profile,
  device,
  telemetry,
  connectionStatus,
  onSOSStart,
  onSOSCancel,
  onSafetyCheck,
  onNavigate,
  networkState,
  contacts = [],
  busy,
  t
}) {
  const sosPointerRef = useRef(null);
  const [isHolding, setIsHolding] = useState(false);

  const connected = ['connected', 'standby'].includes(connectionStatus);
  const weak = connectionStatus === 'weak';
  const protectedState = connected || weak;
  const guardianCount = contacts.filter((c) => c.permissions?.sosAlerts !== false).length + (networkState?.guardians?.length || 0);
  const battery = telemetry?.battery != null ? `${telemetry.battery}%` : '—';
  const name = profile?.firstName || profile?.name?.split?.(' ')?.[0] || 'Luca';
  const eventOnly = device?.monitorMode === 'event-only';

  const statusTitle = protectedState
    ? (eventOnly ? (t?.('v409.home.readyTitle') || 'Sistema pronto') : 'Sistema pronto')
    : 'Configura il tuo Wallaa';

  const statusBody = protectedState
    ? (eventOnly ? (t?.('v409.home.standbyBody') || 'Tutti i servizi operativi') : 'Tutti i servizi operativi')
    : 'Collega il Wallaa Safety Button';

  const start = (event) => {
    event.preventDefault();
    if (busy) return;
    setIsHolding(true);
    sosPointerRef.current = event.pointerId;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
    onSOSStart?.();
  };

  const stop = (event) => {
    if (sosPointerRef.current !== event.pointerId) return;
    sosPointerRef.current = null;
    setIsHolding(false);
    try {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {}
    if (!busy) onSOSCancel?.();
  };

  const suppress = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <section className="w37-home" aria-label="Wallaa Home">
      <div className="w37-bg-perspective-grid" aria-hidden="true" />
      <div className="w37-bg-globe-hologram" aria-hidden="true" />

      <div className="w37-scroll-content">
        <section className="w37-user-hero-row">
          <div className="w37-user-copy">
            <span className="w37-eco-chip">Stay safe. Press Wallaa.</span>
            <h1 className="w37-user-name">Buonasera, {name}</h1>
            <p className="w37-user-sub">Un mondo più sicuro inizia da te.</p>
          </div>
          <div className="w37-tagline-col" aria-hidden="true">
            PERSONE<br />PIÙ SICURE<br />CITTÀ<br />PIÙ VIVE
            <div className="w37-tagline-bar" />
          </div>
        </section>

        <button type="button" className="w37-holo-card w37-status-card" onClick={() => onNavigate?.('device')}>
          <span className={`w37-pulse-dot-green ${protectedState ? '' : 'offline'}`} />
          <span className="w37-card-copy">
            <strong>{statusTitle}</strong>
            <small>{statusBody}</small>
          </span>
          <ChevronRight className="w37-chevron-arrow" size={20} />
        </button>

        <button type="button" className="w37-holo-card w37-device-card" onClick={() => onNavigate?.('device')}>
          <img
            src="/wallaa-button.png"
            alt=""
            aria-hidden="true"
            className={`w37-hardware-button-img ${protectedState ? 'connected' : 'disconnected'}`}
          />
          <div className="w37-device-copy">
            <span className="w37-device-kicker">DISPOSITIVO</span>
            <strong>Wallaa Button</strong>
            <div className="w37-device-meta">
              <span className={`w37-device-status ${protectedState ? 'ok' : 'off'}`}>
                <i /> {protectedState ? (weak ? 'Segnale debole' : 'Connesso') : 'Non collegato'}
              </span>
              <span className="w37-battery"><BatteryMedium size={15} /> Batteria {battery}</span>
            </div>
          </div>
          <ChevronRight className="w37-chevron-arrow" size={20} />
        </button>

        <section className="w37-sos-section">
          <div className="w37-sos-container">
            <div className="w37-crosshair-h" aria-hidden="true" />
            <div className="w37-crosshair-v" aria-hidden="true" />
            <div className="w37-radar-ring w37-ring-sm" aria-hidden="true" />
            <div className="w37-radar-ring w37-ring-md" aria-hidden="true" />
            <div className="w37-radar-ring w37-ring-lg" aria-hidden="true" />

            <button
              type="button"
              className={`w37-sos-button-core ${isHolding ? 'holding' : ''}`}
              disabled={busy}
              aria-label="Tieni premuto per inviare SOS"
              onPointerDown={start}
              onPointerUp={stop}
              onPointerCancel={stop}
              onContextMenu={suppress}
              onDragStart={suppress}
              onSelect={suppress}
              onMouseDown={(e) => e.preventDefault()}
              translate="no"
              spellCheck={false}
            >
              <span className="w37-sos-shine" aria-hidden="true" />
              <span className="w37-sos-txt">SOS</span>
              <span className="w37-sos-sub">Tieni premuto</span>
            </button>
          </div>
          <p className="w37-sos-caption">Premi in caso di emergenza</p>
        </section>

        <div className="w37-grid-actions">
          <button type="button" className="w37-holo-card w37-grid-cell" onClick={() => onNavigate?.('guardian')}>
            <div className="w37-grid-cell-head"><Navigation size={24} /><ChevronRight size={18} /></div>
            <span><strong>Guardian Mode</strong><small>Protezione live</small></span>
          </button>

          <button type="button" className="w37-holo-card w37-grid-cell" onClick={() => onNavigate?.('contacts')}>
            <div className="w37-grid-cell-head"><Users size={24} /><ChevronRight size={18} /></div>
            <span><strong>I miei contatti</strong><small>{guardianCount} configurati</small></span>
          </button>

          <button type="button" className="w37-holo-card w37-grid-cell" onClick={() => onNavigate?.('map')}>
            <div className="w37-grid-cell-head"><MapPin size={24} /><ChevronRight size={18} /></div>
            <span><strong>Posizione</strong><small>Apri mappa</small></span>
          </button>

          <button type="button" className="w37-holo-card w37-grid-cell" onClick={() => onNavigate?.('network')}>
            <div className="w37-grid-cell-head"><QrCode size={24} /><ChevronRight size={18} /></div>
            <span><strong>Safety Network</strong><small>{networkState?.status === 'ready' ? 'Pronta' : 'Da configurare'}</small></span>
          </button>
        </div>

        <button type="button" className="w37-holo-card w37-sentinel-card-home" onClick={() => onNavigate?.('sentinel')}>
          <img src="/sentinel-shield.png" alt="" className="w454-sentinel-menu-icon"/>
          <span className="w37-card-copy"><strong>Sentinel {profile?.plan === 'pro' ? <em className="w454-pro-chip">PRO</em> : null}</strong><small>{profile?.plan === 'pro' ? 'Rete Sentinel + protezione SOS Pro' : 'Vedi la rete e candidati come Sentinel'}</small></span>
          <ChevronRight className="w37-chevron-arrow" size={20}/>
        </button>

        <button type="button" className="w37-holo-card w37-security-card" onClick={() => onSafetyCheck?.()} disabled={busy}>
          <Shield size={26} />
          <span className="w37-card-copy">
            <strong>Controllo sicurezza</strong>
            <small>Controlla lo stato dell’app senza inviare allarmi</small>
          </span>
          <ChevronRight className="w37-chevron-arrow" size={20} />
        </button>
      </div>
    </section>
  );
}
