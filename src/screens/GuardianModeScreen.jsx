import { useEffect, useMemo } from 'react';
import { ArrowLeft, Layers3, LocateFixed, Navigation, Settings, UsersRound } from 'lucide-react';

function tilePosition(lat, lng, zoom = 16) {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = (1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n;
  return { x, y, zoom };
}

function GuardianMap({ lat, lng, active }) {
  const map = useMemo(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const p = tilePosition(lat, lng, 16); const cx = Math.floor(p.x); const cy = Math.floor(p.y);
    const tiles=[]; for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) tiles.push({dx,dy,x:cx+dx,y:cy+dy,z:p.zoom});
    return { tiles, fracX:p.x-cx, fracY:p.y-cy };
  }, [lat,lng]);
  if(!map) return <div className="aa-guardian-empty"><LocateFixed size={34}/><span>Acquisizione posizione…</span></div>;
  const left=`calc(50% - ${256 + map.fracX*256}px)`; const top=`calc(50% - ${256 + map.fracY*256}px)`;
  return <div className="aa-guardian-map">
    <div className="aa-map-tiles" style={{left,top}}>{map.tiles.map(t=><img key={`${t.x}-${t.y}`} src={`https://tile.openstreetmap.org/${t.z}/${t.x}/${t.y}.png`} alt="" draggable="false" style={{left:`${(t.dx+1)*256}px`,top:`${(t.dy+1)*256}px`}}/>)}</div>
    <div className="aa-map-grade"/><svg className="aa-route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M15,88 C24,72 22,62 37,55 S52,44 58,33 S73,23 87,12"/><circle cx="15" cy="88" r="1.5"/><circle cx="38" cy="54" r="1.5"/><circle cx="59" cy="32" r="1.5"/></svg>
    <div className={`aa-live-pin ${active?'active':''}`}><i/><span>Tu<small>In movimento</small></span></div>
    <div className="aa-follower-pin"><b>E</b><span>Elena<small>Ti segue</small></span></div>
    <button className="aa-map-control layers" type="button" aria-label="Livelli"><Layers3/></button><button className="aa-map-control nav" type="button" aria-label="Centra"><Navigation/></button>
  </div>;
}

export default function GuardianModeScreen({ profile, currentLocation, locationStatus, networkState, contacts=[], onToggle, onRefreshLocation, onBack }) {
  const active = profile?.plan === 'pro' && profile?.liveProtectionEnabled === true;
  const lat=Number(currentLocation?.latitude), lng=Number(currentLocation?.longitude); const valid=Number.isFinite(lat)&&Number.isFinite(lng);
  const followers=Math.max(0,(networkState?.guardians?.length||0)+contacts.filter(c=>c.permissions?.liveLocation!==false).length);
  useEffect(()=>{ if(active && !valid && locationStatus!=='checking') onRefreshLocation?.().catch(()=>{}); },[active,valid,locationStatus,onRefreshLocation]);
  return <div className="aa-focus aa-guardian-screen">
    <header className="aa-focus-head"><button type="button" onClick={onBack}><ArrowLeft/></button><div><h1>Guardian Mode</h1><p>In movimento. Sempre protetto.</p></div><button type="button" className="decorative" aria-label="Impostazioni Guardian"><Settings/></button></header>
    <section className="aa-guardian-stage">
      <div className="aa-followers"><div className="aa-avatar-stack"><i className="av1">L</i><i className="av2">G</i><i className="av3">E</i><i className="av4">M</i><b>+{Math.max(0,followers-4)}</b></div><strong>{followers || 0} persone ti seguono in tempo reale</strong></div>
      <div className="aa-map-frame"><div className="aa-map-hud" aria-hidden="true"><span>LIVE TRACKING</span><i/><i/><i/></div><GuardianMap lat={lat} lng={lng} active={active}/></div>
      <div className="aa-guardian-live"><span><i/>Protezione attiva</span><strong>{active?'LIVE':'OFF'}</strong><p><UsersRound/>La tua posizione è condivisa in tempo reale con i tuoi Guardian.</p></div>
      <button type="button" className={`aa-danger-action ${active?'':'start'}`} onClick={()=>onToggle?.(!active)} disabled={profile?.plan!=='pro'}>{profile?.plan!=='pro'?'Guardian Mode richiede Wallaa Pro':active?'Termina Guardian Mode':'Attiva Guardian Mode'}</button>
    </section>
    <p className="aa-focus-note">Aggiornamento posizione circa ogni 5 secondi. La condivisione termina quando disattivi Guardian Mode.</p>
  </div>;
}
