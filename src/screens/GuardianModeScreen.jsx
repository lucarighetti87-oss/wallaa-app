import { useEffect, useMemo } from 'react';
import { ArrowLeft, LocateFixed, Settings, ShieldCheck, UsersRound } from 'lucide-react';

function tilePosition(lat, lng, zoom = 16) {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = (1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n;
  return { x, y, zoom };
}

function initials(name='Guardian') {
  return String(name).trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase() || 'G';
}

function GuardianMap({ lat, lng, active, onRefreshLocation }) {
  const map = useMemo(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const p = tilePosition(lat, lng, 16);
    const cx = Math.floor(p.x), cy = Math.floor(p.y);
    const tiles = [];
    for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) {
      tiles.push({ dx, dy, x:cx+dx, y:cy+dy, z:p.zoom });
    }
    return { tiles, fracX:p.x-cx, fracY:p.y-cy };
  }, [lat,lng]);

  if (!map) {
    return <div className="aa-guardian-empty">
      <LocateFixed size={34}/>
      <span>Acquisizione posizione…</span>
      <button type="button" onClick={()=>onRefreshLocation?.()}>Riprova</button>
    </div>;
  }

  const left = `calc(50% - ${256 + map.fracX*256}px)`;
  const top = `calc(50% - ${256 + map.fracY*256}px)`;

  return <div className="aa-guardian-map aa-guardian-map-real">
    <div className="aa-map-tiles" style={{left,top}}>
      {map.tiles.map(t=><img key={`${t.x}-${t.y}`} src={`https://tile.openstreetmap.org/${t.z}/${t.x}/${t.y}.png`} alt="" draggable="false" style={{left:`${(t.dx+1)*256}px`,top:`${(t.dy+1)*256}px`}}/>)}
    </div>
    <div className="aa-map-grade"/>
    <div className={`aa-live-pin ${active?'active':''}`}>
      <i/>
      <span>Tu<small>La tua posizione</small></span>
    </div>
    <button className="aa-map-control aa-real-locate" type="button" aria-label="Aggiorna posizione" onClick={()=>onRefreshLocation?.()}>
      <LocateFixed/>
    </button>
  </div>;
}

export default function GuardianModeScreen({
  profile,
  currentLocation,
  locationStatus,
  networkState,
  contacts=[],
  onToggle,
  onRefreshLocation,
  onBack
}) {
  const active = profile?.plan === 'pro' && profile?.liveProtectionEnabled === true;
  const lat = Number(currentLocation?.latitude);
  const lng = Number(currentLocation?.longitude);
  const valid = Number.isFinite(lat) && Number.isFinite(lng);

  const guardians = useMemo(() => {
    const rows = [];
    for (const g of (networkState?.guardians || [])) {
      if (g?.liveLocation === false) continue;
      rows.push({
        key: `network:${g.userId || g.id || g.linkId || g.displayName}`,
        name: g.displayName || g.name || 'Guardian'
      });
    }
    for (const c of contacts) {
      if (c?.permissions?.liveLocation === false) continue;
      rows.push({
        key: `contact:${String(c.email || c.phone || c.id || c.name || '').toLowerCase()}`,
        name: c.name || c.displayName || 'Guardian'
      });
    }
    const seen = new Set();
    return rows.filter(row => {
      const k = String(row.key || row.name).toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [networkState?.guardians, contacts]);

  useEffect(() => {
    if (active && !valid && locationStatus !== 'checking') {
      onRefreshLocation?.().catch?.(()=>{});
    }
  }, [active, valid, locationStatus, onRefreshLocation]);

  const capturedAt = currentLocation?.capturedAt ? new Date(currentLocation.capturedAt) : null;
  const lastUpdate = capturedAt && !Number.isNaN(capturedAt.getTime())
    ? capturedAt.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'})
    : '—';
  const accuracy = Number(currentLocation?.accuracy);

  return <div className="aa-focus aa-guardian-screen aa-guardian-real">
    <header className="aa-focus-head">
      <button type="button" onClick={onBack}><ArrowLeft/></button>
      <div>
        <h1>Guardian Mode</h1>
        <p>I Guardian autorizzati riceveranno la tua posizione quando attivi un SOS.</p>
      </div>
      <button type="button" className="decorative" aria-label="Impostazioni Guardian"><Settings/></button>
    </header>

    <section className="aa-guardian-stage">
      <div className="aa-followers aa-real-guardians">
        <div className="aa-real-guardian-title">
          <span className="aa-real-guardian-icon"><UsersRound/></span>
          <div>
            <strong>Guardian autorizzati</strong>
            <small>{guardians.length ? 'Riceveranno la tua posizione durante un SOS attivo.' : 'Nessun Guardian configurato per ricevere la posizione durante un SOS.'}</small>
          </div>
        </div>
        {guardians.length > 0 && <div className="aa-avatar-stack aa-real-avatar-stack">
          {guardians.slice(0,4).map((g,i)=><i key={g.key} title={g.name}>{initials(g.name)}</i>)}
          {guardians.length > 4 && <b>+{guardians.length-4}</b>}
        </div>}
      </div>

      <div className="aa-map-frame">
        <div className="aa-map-hud" aria-hidden="true">
          <span>{active?'POSIZIONE':'POSIZIONE'}</span><i/><i/><i/>
        </div>
        <GuardianMap lat={lat} lng={lng} active={active} onRefreshLocation={onRefreshLocation}/>
      </div>

      <div className="aa-guardian-live aa-real-live-card">
        <span><i className={active?'':'off'}/>Protezione Guardian pronta</span>
        <strong>PRONTA</strong>
        <p><ShieldCheck/>La posizione verrà condivisa con i Guardian solo durante un SOS attivo.</p>
        <div className="aa-real-live-meta">
          <small>Ultimo aggiornamento</small><b>{lastUpdate}</b>
          <small>Precisione</small><b>{Number.isFinite(accuracy)?`± ${Math.round(accuracy)} m`:'—'}</b>
        </div>
      </div>

      <button
        type="button"
        className={`aa-danger-action ${active?'':'start'}`}
        onClick={()=>onToggle?.(!active)}
        disabled={profile?.plan!=='pro'}
      >
        {profile?.plan!=='pro'?'Guardian Mode richiede Wallaa Pro':active?'Termina Guardian Mode':'Attiva Guardian Mode'}
      </button>
    </section>

    <p className="aa-focus-note">La posizione dei Guardian non viene condivisa in questa schermata. Durante un SOS attivo i Guardian autorizzati possono seguire gli aggiornamenti della tua posizione.</p>
  </div>;
}
