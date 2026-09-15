import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import {
  acceptSentinelOffer,
  applyAsSentinel,
  completeSentinelIncident,
  declineSentinelOffer,
  getNearbySentinels,
  getSentinelProfile,
  getCurrentSentinelOffer,
  getCurrentSentinelIncident,
  sendSentinelPresence,
  setSentinelAvailability
} from '../services/sentinel';

function distanceLabel(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return 'nelle vicinanze';
  return n < 1000 ? `${Math.round(n)} m` : `${(n / 1000).toFixed(1)} km`;
}

function sentinelTilePosition(lat, lng, zoom) {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const rad = (lat * Math.PI) / 180;
  const y = (1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2 * n;
  return { x, y, zoom };
}

function sentinelDistanceMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLng = (bLng - aLng) * Math.PI / 180;
  const q =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * Math.PI / 180) *
    Math.cos(bLat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

function SentinelInterventionMap({ incident, currentLocation }) {
  const targetLat = Number(incident?.latitude);
  const targetLng = Number(incident?.longitude);
  const sentinelLat = Number(currentLocation?.latitude);
  const sentinelLng = Number(currentLocation?.longitude);

  const validTarget = Number.isFinite(targetLat) && Number.isFinite(targetLng);
  const validSentinel = Number.isFinite(sentinelLat) && Number.isFinite(sentinelLng);

  const map = useMemo(() => {
    if (!validTarget) return null;

    let centerLat = targetLat;
    let centerLng = targetLng;
    let zoom = 16;

    if (validSentinel) {
      const d = sentinelDistanceMeters(
        sentinelLat, sentinelLng,
        targetLat, targetLng
      );

      if (d <= 250) zoom = 18;
      else if (d <= 600) zoom = 17;
      else if (d <= 1400) zoom = 16;
      else if (d <= 3000) zoom = 15;
      else if (d <= 7000) zoom = 14;
      else zoom = 13;

      centerLat = (targetLat + sentinelLat) / 2;
      centerLng = (targetLng + sentinelLng) / 2;
    }

    const center = sentinelTilePosition(centerLat, centerLng, zoom);
    const cx = Math.floor(center.x);
    const cy = Math.floor(center.y);

    const tiles = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        tiles.push({ x: cx + dx, y: cy + dy, dx, dy, z: zoom });
      }
    }

    const pointOffset = (lat, lng) => {
      const p = sentinelTilePosition(lat, lng, zoom);
      return {
        x: (p.x - center.x) * 256,
        y: (p.y - center.y) * 256
      };
    };

    const target = pointOffset(targetLat, targetLng);
    const sentinel = validSentinel
      ? pointOffset(sentinelLat, sentinelLng)
      : null;

    return {
      tiles,
      center,
      cx,
      cy,
      target,
      sentinel
    };
  }, [
    targetLat,
    targetLng,
    sentinelLat,
    sentinelLng,
    validTarget,
    validSentinel
  ]);

  if (!map) {
    return (
      <div className="sentinel-live-map sentinel-live-map-empty">
        <MapPin size={28}/>
        <strong>Posizione in acquisizione</strong>
      </div>
    );
  }

  const fracX = map.center.x - map.cx;
  const fracY = map.center.y - map.cy;
  const left = `calc(50% - ${256 + fracX * 256}px)`;
  const top = `calc(50% - ${256 + fracY * 256}px)`;

  let routeStyle = null;

  if (map.sentinel) {
    const dx = map.target.x - map.sentinel.x;
    const dy = map.target.y - map.sentinel.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    routeStyle = {
      left: `calc(50% + ${map.sentinel.x}px)`,
      top: `calc(50% + ${map.sentinel.y}px)`,
      width: `${length}px`,
      transform: `rotate(${angle}deg)`
    };
  }

  return (
    <div className="sentinel-live-map">
      <div
        className="sentinel-live-map-tiles"
        style={{ left, top }}
      >
        {map.tiles.map((tile) => (
          <img
            key={`${tile.x}-${tile.y}`}
            src={`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`}
            alt=""
            draggable="false"
            style={{
              left: `${(tile.dx + 1) * 256}px`,
              top: `${(tile.dy + 1) * 256}px`
            }}
          />
        ))}
      </div>

      <div className="sentinel-live-map-grade"/>

      {routeStyle && (
        <div
          className="sentinel-live-route"
          style={routeStyle}
        />
      )}

      {map.sentinel && (
        <div
          className="sentinel-live-self"
          style={{
            left: `calc(50% + ${map.sentinel.x}px)`,
            top: `calc(50% + ${map.sentinel.y}px)`
          }}
        >
          <span>TU</span>
        </div>
      )}

      <div
        className="sentinel-live-target"
        style={{
          left: `calc(50% + ${map.target.x}px)`,
          top: `calc(50% + ${map.target.y}px)`
        }}
      >
        <i/>
        <MapPin size={21}/>
      </div>

      <div className="sentinel-live-map-copy">
        <div>
          <small>UTENTE DA RAGGIUNGERE</small>
          <strong>{distanceLabel(incident?.distanceM)}</strong>
          <span>Posizione live dell'utente</span>
        </div>
      </div>

      <div className="sentinel-live-map-attribution">
        © OpenStreetMap contributors
      </div>
    </div>
  );
}

export default function SentinelScreen({ networkIdentity, currentLocation, onRefreshLocation, onBack, onHome, onOpenChat, sentinelOffer, clearSentinelOffer, setToast, plan = 'basic' }) {
  const [state, setState] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [busy, setBusy] = useState(false);
  const [incident, setIncident] = useState(null);
  const [serverOffer, setServerOffer] = useState(null);

  const refresh = useCallback(async () => {
    if (!networkIdentity?.authToken) return;

    try {
      const [me, list, offerResult, incidentResult] = await Promise.all([
        getSentinelProfile(networkIdentity),
        getNearbySentinels(networkIdentity, currentLocation)
          .catch(() => ({ sentinels: [] })),
        getCurrentSentinelOffer(networkIdentity)
          .catch(() => null),
        getCurrentSentinelIncident(networkIdentity)
          .catch(() => null)
      ]);

      setState(me);
      setNearby(list?.sentinels || []);

      if (offerResult !== null) {
        const authoritativeOffer = offerResult?.offer || null;
        setServerOffer(authoritativeOffer);

        if (!authoritativeOffer) {
          clearSentinelOffer?.();
        }
      }

      if (incidentResult !== null) {
        setIncident(incidentResult?.incident || null);
      } else if (me?.activeIncident) {
        setIncident(me.activeIncident);
      }
    } catch (error) {
      setToast?.({
        type: 'error',
        text: error.message
      });
    }
  }, [
    networkIdentity?.authToken,
    currentLocation?.latitude,
    currentLocation?.longitude,
    clearSentinelOffer,
    setToast
  ]);

  useEffect(() => { refresh(); const id = setInterval(refresh, 8000); return () => clearInterval(id); }, [refresh]);
  useEffect(() => { if (!currentLocation) onRefreshLocation?.().catch(() => {}); }, [currentLocation, onRefreshLocation]);

  // WALLAA_SENTINEL_ACTIVE_INTERVENTION_TRACKING
  // Durante un intervento accettato aggiorna più rapidamente la posizione
  // della Sentinel. Il heartbeat universale a 30s resta invariato.
  useEffect(() => {
    if (!incident || !networkIdentity?.authToken) return undefined;

    let stopped = false;
    let running = false;

    const publish = async () => {
      if (stopped || running) return;
      running = true;

      try {
        const loc = await onRefreshLocation?.();

        if (!stopped && loc) {
          await sendSentinelPresence(networkIdentity, loc);
        }
      } catch (error) {
        console.warn(
          '[WALLAA][SENTINEL][INTERVENTION_LOCATION]',
          error?.message || error
        );
      } finally {
        running = false;
      }
    };

    publish();

    const timer = setInterval(publish, 5000);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [
    incident?.id,
    networkIdentity?.authToken,
    onRefreshLocation
  ]);
  const offer = serverOffer || sentinelOffer || null;
  const available = Boolean(state?.profile?.available);
  const verified = Boolean(state?.profile?.verified);
  const enabled = state?.enabled !== false;

  async function run(task) {
    setBusy(true);
    try { await task(); await refresh(); }
    catch (error) { setToast?.({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  }

  async function toggleAvailability() {
    await run(async () => {
      if (!currentLocation) await onRefreshLocation?.();
      await setSentinelAvailability(networkIdentity, !available);
      if (!available) {
        const loc = currentLocation || await onRefreshLocation?.();
        if (loc) await sendSentinelPresence(networkIdentity, loc);
      }
    });
  }

  async function acceptOffer() {
    if (!offer?.offerId) return;
    await run(async () => {
      const result = await acceptSentinelOffer(
        networkIdentity,
        offer.offerId
      );
      setIncident(result.incident);
      setServerOffer(null);
      clearSentinelOffer?.();
    });
  }
  async function declineOffer() {
    if (!offer?.offerId) return;
    await run(async () => {
      await declineSentinelOffer(
        networkIdentity,
        offer.offerId
      );
      setServerOffer(null);
      clearSentinelOffer?.();
    });
  }

  // WALLAA_V4_0_60_SENTINEL_ROLE_FIX: Basic/Standard users may serve as Sentinel.
  if(!enabled) return <section className="sentinel-page"><div className="sentinel-top"><button onClick={onBack}><ArrowLeft/></button><img src="/wallaa-app-icon.png" onClick={onHome} alt="Wallaa"/><span/></div><div className="sentinel-empty"><ShieldCheck size={48}/><h1>Wallaa Sentinel</h1><p>Il servizio Sentinel non è ancora attivo su questo ambiente.</p><button className="sentinel-primary" onClick={onBack}>Torna indietro</button></div></section>;

  if (incident) {
    const maps = `https://maps.apple.com/?daddr=${incident.latitude},${incident.longitude}`;
    return <section className="sentinel-page sentinel-intervention">
      <div className="sentinel-top"><button onClick={onBack}><ArrowLeft/></button><button className="sentinel-brand" onClick={onHome}><img src="/wallaa-app-icon.png" alt="Wallaa"/><b>Wallaa</b></button><span/></div>
      <div className="sentinel-incident-head"><span className="sentinel-red-dot"/><div><small>INTERVENTO IN CORSO</small><h1>Raggiungi l'utente in sicurezza</h1></div></div>
      <SentinelInterventionMap incident={incident} currentLocation={currentLocation}/>
      <div className="sentinel-guidance"><div><MapPin/><span><b>Indicazioni</b><small>Apri Apple Maps</small></span></div><a href={maps}>Apri <ChevronRight/></a></div>
      <div className="sentinel-warning"><ShieldCheck/><p>Non affrontare situazioni pericolose. Se necessario contatta subito i servizi di emergenza.</p></div>
      {incident?.conversationId && (
        <button
          type="button"
          className="sentinel-chat-button"
          onClick={() => onOpenChat?.({
            id: incident.conversationId,
            name: incident.userName || 'Utente Wallaa',
            conversationType: 'sentinel',
            sentinelIncidentId: incident.id,
            closed: false
          })}
        >
          <MessageCircle size={18}/>
          Chat emergenza
        </button>
      )}

      <button className="sentinel-danger" disabled={busy} onClick={() => run(async () => { await completeSentinelIncident(networkIdentity, incident.id); setIncident(null); })}>Termina intervento</button>
    </section>;
  }

  return <section className="sentinel-page">
    <div className="sentinel-top"><button onClick={onBack}><ArrowLeft/></button><button className="sentinel-brand" onClick={onHome}><img src="/wallaa-app-icon.png" alt="Wallaa"/><b>Wallaa</b></button><span/></div>
    {offer && <div className="sentinel-offer"><div className="sentinel-offer-title"><span>RICHIESTA DI AIUTO</span><h2>NELLE VICINANZE</h2></div><div className="sentinel-offer-radar"><i/><MapPin/><strong>{distanceLabel(offer.distanceM)}</strong><small>zona approssimativa</small></div><p>Prima di accettare vedi solo distanza e zona approssimativa. La posizione precisa viene mostrata dopo l'accettazione.</p><div className="sentinel-offer-actions"><button disabled={busy} onClick={declineOffer}>Non posso</button><button disabled={busy} onClick={acceptOffer}>Accetta</button></div></div>}
    <div className="sentinel-hero"><img src="/sentinel-shield.png" alt="Wallaa Sentinel"/><div><small>WALLAA SENTINEL</small><h1>La rete che rende Wallaa più forte</h1><p>Persone verificate e disponibili nelle vicinanze possono aiutare quando serve.</p></div></div>

    {!state?.profile ? <div className="sentinel-join"><h2>Diventa Sentinel</h2><p>Metti la tua disponibilità al servizio della community Wallaa.</p><button className="sentinel-primary" disabled={busy} onClick={() => run(() => applyAsSentinel(networkIdentity))}>Invia candidatura</button></div> :
      <div className="sentinel-status-card"><div><small>STATO SENTINEL</small><h2>{verified ? 'Profilo verificato' : 'Candidatura ricevuta'}</h2><p>{verified ? 'Puoi scegliere quando essere disponibile.' : 'La verifica viene gestita da Wallaa.'}</p></div><span className={verified ? 'verified' : 'pending'}>{verified ? <CheckCircle2/> : 'IN VERIFICA'}</span></div>}
    {verified && <button className={`sentinel-availability ${available ? 'on' : ''}`} disabled={busy} onClick={toggleAvailability}><span><b>{available ? 'Disponibile' : 'Non disponibile'}</b><small>{available ? 'Puoi ricevere richieste Sentinel' : 'Non riceverai richieste'}</small></span><i/></button>}
    <div className="sentinel-nearby"><div className="sentinel-section-title"><div><small>RETE VICINA</small><h2>Sentinel nella tua area</h2></div><b>{nearby.length}</b></div>{nearby.slice(0,6).map((item, index) => <div className="sentinel-nearby-row" key={item.id || index}><img src="/sentinel-shield.png" alt=""/><span><b>{`Sentinel ${index + 1}`}</b><small>{item.statusLabel || 'Disponibile'} · posizione protetta</small></span></div>)}</div>
  </section>;
}
