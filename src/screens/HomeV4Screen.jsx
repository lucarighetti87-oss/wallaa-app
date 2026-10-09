import SentinelHomeAura from '../components/SentinelHomeAura';
import {useSentinelMode} from '../hooks/useSentinelMode';
import {uiText,uiLocale} from '../uiText.js';
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
  const sentinelActive=useSentinelMode();
  const sosPointerRef = useRef(null);
  const [isHolding, setIsHolding] = useState(false);

  const connected = ['connected', 'standby'].includes(connectionStatus);
  const weak = connectionStatus === 'weak';
  const protectedState = connected || weak;
  const guardianCount = new Set([...contacts.filter(c=>c.permissions?.sosAlerts!==false).map(c=>c.networkUserId||c.id),...(networkState?.guardians||[]).filter(c=>c.permissions?.sosAlerts!==false).map(c=>c.userId)]).size;
  const battery = telemetry?.battery != null ? `${telemetry.battery}%` : '—';
  const name = profile?.firstName || profile?.name?.split?.(' ')?.[0] || 'Luca';
  const eventOnly = device?.monitorMode === 'event-only';

  const statusTitle = protectedState
    ? (eventOnly ? (t?.('v409.home.readyTitle') || uiText("Sistema pronto")) : uiText("Sistema pronto"))
    : uiText("Configura il tuo Wallaa");

  const statusBody = protectedState
    ? (eventOnly ? (t?.('v409.home.standbyBody') || uiText("Tutti i servizi operativi")) : uiText("Tutti i servizi operativi"))
    : uiText("Collega il Wallaa Safety Button");

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
    <section className={`w37-home ${sentinelActive ? 'sentinel-mode-active' : ''}`} aria-label="Wallaa Home">
      <div className="w37-bg-perspective-grid" aria-hidden="true" />
      <div className="w37-bg-globe-hologram" aria-hidden="true" />

      <SentinelHomeAura/>
      <div className="w37-scroll-content">
        <section className="w37-user-hero-row">
          <div className="w37-user-copy">
            <span className="w37-eco-chip">Stay safe. Press Wallaa.</span>
            <h1 className="w37-user-name">{"" + uiText("Buonasera,") + " "}{name}</h1>
            <p className="w37-user-sub">{"" + uiText("Un mondo più sicuro inizia da te.") + ""}</p>
          </div>
          <div className="w37-tagline-col" aria-hidden="true">{"" + uiText("PERSONE") + ""}<br />{"" + uiText("PIÙ SICURE") + ""}<br />{"" + uiText("CITTÀ") + ""}<br />{"" + uiText("PIÙ VIVE") + " "}<div className="w37-tagline-bar" />
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
            <span className="w37-device-kicker">{"" + uiText("DISPOSITIVO") + ""}</span>
            <strong>{"" + uiText("Wallaa Button") + ""}</strong>
            <div className="w37-device-meta">
              <span className={`w37-device-status ${protectedState ? 'ok' : 'off'}`}>
                <i /> {protectedState ? (weak ? uiText("Segnale debole") : uiText("Connesso")) : uiText("Non collegato")}
              </span>
              <span className="w37-battery"><BatteryMedium size={15} />{" " + uiText("Batteria") + " "}{battery}</span>
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
              aria-label={uiText("Tieni premuto per inviare SOS")}
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
              <span className="w37-sos-sub">{"" + uiText("Tieni premuto") + ""}</span>
            </button>
          </div>
          <p className="w37-sos-caption">{"" + uiText("Premi in caso di emergenza") + ""}</p>
        </section>

        <div className="w37-grid-actions">
          <button type="button" className="w37-holo-card w37-grid-cell w-safety-home-card" onClick={() => onNavigate?.('network')}>
            <div className="w37-grid-cell-head"><Users size={24}/><ChevronRight size={18}/></div>
            <span><strong>{uiText('Rete di Sicurezza')}</strong><small>{guardianCount} {uiText('Persone nella tua rete')}</small></span>
          </button>

          <button type="button" className="w37-holo-card w37-grid-cell" onClick={() => onNavigate?.('map')}>
            <div className="w37-grid-cell-head"><MapPin size={24} /><ChevronRight size={18} /></div>
            <span><strong>{"" + uiText("Posizione") + ""}</strong><small>{"" + uiText("Apri mappa") + ""}</small></span>
          </button>

        </div>

        <button type="button" className="w37-holo-card w37-sentinel-card-home" onClick={() => onNavigate?.('sentinel')}>
          <img src="/sentinel-shield.png" alt="" className="w454-sentinel-menu-icon"/>
          <span className="w37-card-copy"><strong>Sentinel {sentinelActive&&<span className="sentinel-mode-label">{uiText('Attiva')}</span>} {profile?.plan === 'pro' ? <em className="w454-pro-chip">PRO</em> : null}</strong><small>{profile?.plan === 'pro' ? uiText("Rete Sentinel + protezione SOS Pro") : uiText("Vedi la rete e candidati come Sentinel")}</small></span>
          <ChevronRight className="w37-chevron-arrow" size={20}/>
        </button>

        <button type="button" className="w37-holo-card w37-security-card" onClick={() => onSafetyCheck?.()} disabled={busy}>
          <Shield size={26} />
          <span className="w37-card-copy">
            <strong>{"" + uiText("Controllo sicurezza") + ""}</strong>
            <small>{"" + uiText("Controlla lo stato dell’app senza inviare allarmi") + ""}</small>
          </span>
          <ChevronRight className="w37-chevron-arrow" size={20} />
        </button>
      </div>
    </section>
  );
}
