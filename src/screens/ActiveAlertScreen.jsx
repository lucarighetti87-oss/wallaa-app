import { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Navigation,
  Radio,
  ShieldCheck,
  UsersRound,
  X
} from 'lucide-react';

import HoldToConfirmButton from '../components/HoldToConfirmButton';
import { getMySosSentinel } from '../services/sentinel';

function elapsedSince(value){
  const start = new Date(value || Date.now()).getTime();
  return Math.max(0, Math.floor((Date.now() - start) / 1000));
}

function fmt(sec){
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatDistance(value){
  const n = Number(value);
  if(!Number.isFinite(n)) return '—';
  if(n < 1000) return `${Math.max(0, Math.round(n))} m`;
  return `${(n / 1000).toFixed(n < 10000 ? 1 : 0)} km`;
}

function formatEta(value){
  const sec = Number(value);
  if(!Number.isFinite(sec) || sec <= 0) return '—';
  const min = Math.max(1, Math.round(sec / 60));
  return `${min} min`;
}

function tileXY(lat, lng, zoom){
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const latRad = lat * Math.PI / 180;
  const y = (
    1 -
    Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI
  ) / 2 * n;
  return { x, y };
}

function haversineMeters(a, b){
  if(!a || !b) return null;

  const lat1 = Number(a.latitude);
  const lon1 = Number(a.longitude);
  const lat2 = Number(b.latitude);
  const lon2 = Number(b.longitude);

  if(
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) return null;

  const R = 6371000;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const q =
    Math.sin(dp / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

function chooseZoom(distanceM){
  const d = Number(distanceM);
  if(!Number.isFinite(d)) return 15;
  if(d < 500) return 17;
  if(d < 1500) return 16;
  if(d < 4000) return 15;
  if(d < 10000) return 14;
  if(d < 25000) return 13;
  return 12;
}

function SosSentinelMap({ userLocation, sentinel }){
  const userLat = Number(userLocation?.latitude);
  const userLng = Number(userLocation?.longitude);
  const sentinelLat = Number(sentinel?.latitude);
  const sentinelLng = Number(sentinel?.longitude);

  const valid =
    Number.isFinite(userLat) &&
    Number.isFinite(userLng) &&
    Number.isFinite(sentinelLat) &&
    Number.isFinite(sentinelLng);

  if(!valid){
    return (
      <div className="aa-sentinel-map aa-sentinel-map-empty">
        <Navigation/>
        <strong>Localizzazione Sentinel…</strong>
        <small>La posizione comparirà appena disponibile.</small>
      </div>
    );
  }

  const distanceM =
    Number.isFinite(Number(sentinel?.distanceM))
      ? Number(sentinel.distanceM)
      : haversineMeters(
          { latitude:userLat, longitude:userLng },
          { latitude:sentinelLat, longitude:sentinelLng }
        );

  const zoom = chooseZoom(distanceM);
  const centerLat = (userLat + sentinelLat) / 2;
  const centerLng = (userLng + sentinelLng) / 2;

  const center = tileXY(centerLat, centerLng, zoom);
  const user = tileXY(userLat, userLng, zoom);
  const responder = tileXY(sentinelLat, sentinelLng, zoom);

  const baseX = Math.floor(center.x) - 1;
  const baseY = Math.floor(center.y) - 1;

  const width = 768;
  const height = 768;

  const centerPxX = (center.x - baseX) * 256;
  const centerPxY = (center.y - baseY) * 256;

  const offsetX = 384 - centerPxX;
  const offsetY = 384 - centerPxY;

  const userX = (user.x - baseX) * 256 + offsetX;
  const userY = (user.y - baseY) * 256 + offsetY;
  const sentinelX = (responder.x - baseX) * 256 + offsetX;
  const sentinelY = (responder.y - baseY) * 256 + offsetY;

  const tiles = [];

  for(let row = 0; row < 3; row++){
    for(let col = 0; col < 3; col++){
      const tx = baseX + col;
      const ty = baseY + row;

      tiles.push(
        <img
          key={`${tx}-${ty}`}
          src={`https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`}
          alt=""
          draggable="false"
          style={{
            left: `${col * 256 + offsetX}px`,
            top: `${row * 256 + offsetY}px`
          }}
        />
      );
    }
  }

  return (
    <div className="aa-sentinel-map">
      <div className="aa-sentinel-map-tiles">
        {tiles}
      </div>

      <svg
        className="aa-sentinel-map-line"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          x1={userX}
          y1={userY}
          x2={sentinelX}
          y2={sentinelY}
        />
      </svg>

      <div
        className="aa-sentinel-marker aa-sentinel-marker-user"
        style={{
          left:`${(userX / width) * 100}%`,
          top:`${(userY / height) * 100}%`
        }}
      >
        <i/>
        <span>TU</span>
      </div>

      <div
        className="aa-sentinel-marker aa-sentinel-marker-responder"
        style={{
          left:`${(sentinelX / width) * 100}%`,
          top:`${(sentinelY / height) * 100}%`
        }}
      >
        <b><ShieldCheck/></b>
        <span>SENTINEL</span>
      </div>

      <div className="aa-sentinel-map-attribution">
        © OpenStreetMap contributors
      </div>
    </div>
  );
}

export default function ActiveAlertScreen({
  alert,
  onSafe,
  onHome,
  busy,
  networkIdentity,
  currentLocation,
  onOpenChat
}) {
  const [elapsed, setElapsed] = useState(() => elapsedSince(alert?.at));
  const [sentinel, setSentinel] = useState(null);

  useEffect(() => {
    const id = setInterval(
      () => setElapsed(elapsedSince(alert?.at)),
      1000
    );

    return () => clearInterval(id);
  }, [alert?.at]);

  useEffect(() => {
    if(
      !alert?.id ||
      !alert?.active ||
      !networkIdentity?.authToken
    ){
      setSentinel(null);
      return undefined;
    }

    let cancelled = false;

    const refresh = async () => {
      try{
        const result = await getMySosSentinel(
          networkIdentity,
          alert.id
        );

        if(cancelled) return;

        setSentinel(result?.sentinel || null);
      }catch(error){
        if(cancelled) return;

        console.warn(
          '[WALLAA][SENTINEL][SOS_TRACKING]',
          error?.message || error
        );
      }
    };

    refresh();

    const timer = setInterval(refresh, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [
    alert?.id,
    alert?.active,
    networkIdentity?.authToken
  ]);

  const time = useMemo(
    () =>
      new Date(alert?.at || Date.now()).toLocaleTimeString(
        'it-IT',
        {
          hour:'2-digit',
          minute:'2-digit'
        }
      ),
    [alert?.at]
  );

  if(!alert) return null;

  const delivered =
    (alert?.delivered?.length || 0) +
    (alert?.pushDelivered?.length || 0);

  const userLocation =
    alert?.location ||
    currentLocation ||
    null;

  const liveDistance =
    sentinel?.latitude != null &&
    sentinel?.longitude != null
      ? haversineMeters(
          userLocation,
          {
            latitude:sentinel.latitude,
            longitude:sentinel.longitude
          }
        )
      : null;

  const shownDistance =
    Number.isFinite(liveDistance)
      ? liveDistance
      : sentinel?.distanceM;

  return (
    <div className="aa-focus aa-sos-active-screen">
      <div
        className="aa-sos-network-bg"
        aria-hidden="true"
      />

      <header className="aa-sos-head">
        <button
          type="button"
          className="aa-wordmark compact aa-wordmark-home"
          onClick={onHome}
          aria-label="Torna alla Home"
        >
          <img
            src="/wallaa-app-icon.png"
            alt="Wallaa"
          />
          <span>
            <strong>Wallaa</strong>
            <small>SAFETY</small>
          </span>
        </button>

        <h1>SOS ATTIVO</h1>
        <p>La nostra squadra è con te.</p>
      </header>

      <section className="aa-live-sos">
        <div className="aa-emergency-rings"/>
        <div className="aa-live-sos-core">
          <strong>SOS</strong>
          <span>{fmt(elapsed)}</span>
        </div>
      </section>

      {sentinel && (
        <section className="aa-sentinel-arrival">
          <div className="aa-sentinel-arrival-head">
            <div className="aa-sentinel-shield">
              <ShieldCheck/>
            </div>

            <div>
              <small>WALLAA SENTINEL</small>
              <h2>Sentinel in arrivo</h2>
              <p>
                {sentinel.name || 'Wallaa Sentinel'}
                {sentinel.verified ? (
                  <span className="aa-sentinel-verified">
                    <CheckCircle2/>
                    Verificata
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <SosSentinelMap
            userLocation={userLocation}
            sentinel={sentinel}
          />

          <div className="aa-sentinel-stats">
            <div>
              <small>DISTANZA</small>
              <strong>{formatDistance(shownDistance)}</strong>
            </div>

            <div>
              <small>ARRIVO STIMATO</small>
              <strong>{formatEta(sentinel.etaSeconds)}</strong>
            </div>

            <div>
              <small>STATO</small>
              <strong>
                {sentinel.status === 'arrived'
                  ? 'Arrivata'
                  : 'In arrivo'}
              </strong>
            </div>
          </div>

          <div className="aa-sentinel-live-status">
            <i/>
            <span>
              <strong>Posizione Sentinel live</strong>
              <small>
                {sentinel.presenceAgeSec != null
                  ? `Aggiornata ${sentinel.presenceAgeSec}s fa`
                  : 'Aggiornamento in corso'}
              </small>
            </span>
          </div>

          {sentinel.conversationId && (
            <button
              type="button"
              className="aa-sentinel-chat-button"
              onClick={() => onOpenChat?.({
                id: sentinel.conversationId,
                name: sentinel.name || 'Wallaa Sentinel',
                conversationType: 'sentinel',
                sentinelIncidentId: sentinel.incidentId,
                closed: false
              })}
            >
              <MessageCircle size={18}/>
              Chat con la Sentinel
            </button>
          )}
        </section>
      )}

      <section className="aa-sos-timeline">
        <div>
          <i className="red"><BellRing/></i>
          <time>{time}</time>
          <span>
            <strong>SOS attivato</strong>
            <small>Segnale inviato alla centrale</small>
          </span>
        </div>

        <div>
          <i><Radio/></i>
          <time>+01</time>
          <span>
            <strong>Centrale operativa notificata</strong>
            <small>La richiesta è stata presa in carico</small>
          </span>
        </div>

        <div>
          <i className={delivered ? 'green' : ''}>
            <UsersRound/>
          </i>
          <time>+02</time>
          <span>
            <strong>Contatti di emergenza avvisati</strong>
            <small>
              {delivered
                ? `${delivered} notifiche inviate`
                : 'Invio in corso'}
            </small>
          </span>
        </div>

        <div>
          <i className="green"><MapPin/></i>
          <time>LIVE</time>
          <span>
            <strong>Posizione condivisa</strong>
            <small>
              In tempo reale con centrale e contatti
            </small>
          </span>
        </div>

        {sentinel && (
          <div>
            <i className="green"><ShieldCheck/></i>
            <time>LIVE</time>
            <span>
              <strong>Sentinel assegnata</strong>
              <small>
                {sentinel.name || 'Wallaa Sentinel'} è in arrivo
              </small>
            </span>
          </div>
        )}
      </section>

      <HoldToConfirmButton
        className="aa-cancel-sos"
        duration={1600}
        onConfirm={onSafe}
        disabled={busy}
        ariaLabel="Chiudi SOS"
      >
        <X/>
        <strong>
          {busy
            ? 'Chiusura in corso…'
            : 'Sono al sicuro / chiudi SOS'}
        </strong>
      </HoldToConfirmButton>

      <p className="aa-focus-note">
        La centrale è già stata allertata. Usa questo comando solo
        quando la situazione è realmente risolta.
      </p>
    </div>
  );
}
