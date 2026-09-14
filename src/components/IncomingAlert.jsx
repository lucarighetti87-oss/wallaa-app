// WALLAA_V4_0_64_SOS_MAP_LAYOUT_FIX — centra sempre il mosaico OSM sul fix GPS, senza area vuota laterale.
import { useEffect, useMemo } from 'react';
import { BellRing, ExternalLink, MapPin, Phone, ShieldAlert, Volume2, X } from 'lucide-react';
import { formatDateTime } from '../utils/format';
import { clearDeliveredWallaaNotifications, stopWallaaAlarm } from '../services/push';

function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
function tilePoint(lat,lng,zoom){
  const n=2**zoom;
  const x=(lng+180)/360*n;
  const safeLat=clamp(lat,-85.0511,85.0511)*Math.PI/180;
  const y=(1-Math.asinh(Math.tan(safeLat))/Math.PI)/2*n;
  return {x,y};
}
function LiveMap({lat,lng,accuracy}){
  const zoom=16;
  const data=useMemo(()=>{
    if(!Number.isFinite(lat)||!Number.isFinite(lng)) return null;
    const p=tilePoint(lat,lng,zoom), cx=Math.floor(p.x), cy=Math.floor(p.y);
    const tiles=[];
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) tiles.push({x:cx+dx,y:cy+dy,dx,dy});
    return {tiles,offsetX:256+(p.x-cx)*256,offsetY:256+(p.y-cy)*256};
  },[lat,lng]);
  if(!data) return <div className="incoming-live-map waiting"><div><MapPin size={28}/><strong>Posizione in acquisizione…</strong><span>La mappa apparirà automaticamente al primo fix GPS.</span></div></div>;
  return <div className="incoming-live-map" aria-label="Posizione SOS live">
    <div className="incoming-tile-grid" style={{transform:`translate(${-data.offsetX}px, ${-data.offsetY}px)`}}>
      {data.tiles.map(t=><img key={`${t.x}-${t.y}`} src={`https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`} alt="" draggable="false"/>)}
    </div>
    <div className="incoming-map-vignette"/>
    {accuracy>0&&<div className="incoming-accuracy" style={{width:`${clamp(accuracy/2,34,120)}px`,height:`${clamp(accuracy/2,34,120)}px`}}/>}
    <div className="incoming-live-pin"><i/><MapPin size={21}/></div>
    <span className="incoming-live-badge"><i/> LIVE</span>
  </div>;
}

export default function IncomingAlert({ alert, onClose, t, language }) {
  useEffect(() => {
    if (!alert) stopWallaaAlarm();
    return () => stopWallaaAlarm();
  }, [alert?.id]);
  if (!alert) return null;
  const lat=Number(alert.location?.latitude), lng=Number(alert.location?.longitude), accuracy=Number(alert.location?.accuracy||0);
  const valid=Number.isFinite(lat)&&Number.isFinite(lng);
  const mapsUrl=alert.location?.mapsUrl||(valid?`https://www.google.com/maps?q=${lat},${lng}`:'#');
  const owner=alert.ownerName||'Wallaa';
  const phone=String(alert.ownerPhone||'').trim();
  const phoneHref=phone?`tel:${phone.replace(/[^+\d]/g,'')}`:'';
  const acknowledge=async()=>{stopWallaaAlarm();await clearDeliveredWallaaNotifications();onClose?.();};
  return <div className="incoming-alert-backdrop wallaa-sos-v462" role="alertdialog" aria-modal="true" aria-label="SOS Wallaa ricevuto">
    <section className="incoming-alert-card wallaa-sos-card">
      <header className="wallaa-sos-top"><div className="wallaa-sos-brand"><span>W</span><div><strong>WALLAA</strong><small>SAFETY NETWORK</small></div></div><button className="incoming-close" onClick={acknowledge} aria-label={t('common.close')}><X size={20}/></button></header>
      <div className="wallaa-sos-status"><span className="wallaa-sos-icon"><ShieldAlert size={24}/></span><div><small><BellRing size={13}/> SOS RICEVUTO</small><h2>{owner}</h2><p>ha bisogno di te adesso.</p></div></div>
      <div className="incoming-audible-status"><Volume2 size={16}/><span>Sirena Guardian attiva — conferma per interromperla</span></div>
      <div className="wallaa-sos-map-wrap">
        <LiveMap lat={valid?lat:NaN} lng={valid?lng:NaN} accuracy={accuracy}/>
        <div className="wallaa-sos-map-meta"><div><small>POSIZIONE SOS · AGGIORNAMENTO AUTOMATICO</small><strong>{valid?`${lat.toFixed(6)}, ${lng.toFixed(6)}`:'In attesa del GPS…'}</strong></div><span>{accuracy>0?`±${Math.round(accuracy)} m · `:''}{formatDateTime(alert.location?.capturedAt||alert.at,language)}</span></div>
      </div>
      <p className="wallaa-sos-help">La posizione si aggiorna automaticamente in questa schermata. Non serve aprire una seconda pagina.</p>
      <div className="incoming-action-grid">
        {phoneHref&&<a className="incoming-call-cta" href={phoneHref}><Phone size={19}/>Chiama la persona</a>}
        {valid&&<a className="incoming-map-cta" href={mapsUrl} target="_blank" rel="noreferrer"><MapPin size={19}/>Apri in Mappe <ExternalLink size={14}/></a>}
      </div>
      <button className="incoming-dismiss" onClick={acknowledge}>Ho visto l’alert</button>
      <small className="incoming-disclaimer">Wallaa non sostituisce i servizi pubblici di emergenza.</small>
    </section>
  </div>;
}
