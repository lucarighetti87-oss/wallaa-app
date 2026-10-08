import {sentinelMapOffset,clusterSentinelMarkers,sentinelDirection} from '../services/sentinelMap';
// WALLAA_V4_0_63_SENTINEL_MAP_ALL_USERS — nearby markers are visible to every authenticated plan; dispatch remains backend Pro-only.
// WALLAA_V4_0_61_SENTINEL_VISIBILITY_FIX
import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, ExternalLink, LocateFixed, MapPin, Navigation, RefreshCw, ShieldCheck } from 'lucide-react';
import { getNearbySentinels } from '../services/sentinel';

function appleMapsUrl(lat, lng) { return `https://maps.apple.com/?ll=${encodeURIComponent(`${lat},${lng}`)}&q=${encodeURIComponent('Wallaa location')}`; }
function tilePosition(lat, lng, zoom = 16) { const n=2**zoom; const x=((lng+180)/360)*n; const r=(lat*Math.PI)/180; const y=(1-Math.asinh(Math.tan(r))/Math.PI)/2*n; return {x,y,zoom}; }
function LiveMap({ lat, lng, emergency, sentinels = [], showUserPin = true, sentinelMode = false }) {
  const mapRef = useRef(null);
  const [selectedCluster,setSelectedCluster]=useState(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return undefined;
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setMapSize({ width: Math.max(0, rect.width), height: Math.max(0, rect.height) });
    };
    updateSize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSize) : null;
    observer?.observe(element);
    window.addEventListener('resize', updateSize);
    return () => { observer?.disconnect(); window.removeEventListener('resize', updateSize); };
  }, []);

  const map = useMemo(() => {
    if(!Number.isFinite(lat)||!Number.isFinite(lng)) return null;
    const p=tilePosition(lat,lng,16),cx=Math.floor(p.x),cy=Math.floor(p.y),fracX=p.x-cx,fracY=p.y-cy,tiles=[];
    for(let dy=-1;dy<=1;dy+=1) for(let dx=-1;dx<=1;dx+=1) tiles.push({dx,dy,x:cx+dx,y:cy+dy,z:p.zoom});
    return {tiles,fracX,fracY};
  },[lat,lng]);

  if(!map) return <div className={`v412-real-map empty ${emergency?'emergency':''}`}><div className="v412-map-placeholder"><Crosshair size={28}/><span>GPS</span></div></div>;

  const left=`calc(50% - ${256+map.fracX*256}px)`;
  const top=`calc(50% - ${256+map.fracY*256}px)`;
  const markerRadius = sentinelMode ? 25 : 22;
  const edgePadding = markerRadius + 8;
  const rawMarkers=sentinels.slice(0,20).map((sentinel,index)=>{const position=sentinelMapOffset(sentinel,lat,lng,mapSize.width,mapSize.height,edgePadding);return position?{...position,sentinel,index}:null;}).filter(Boolean);
  const clusters=clusterSentinelMarkers(rawMarkers);

  return <div ref={mapRef} className={`v412-real-map ${emergency?'emergency':''}`}>
    <div className="v412-tile-canvas" style={{left,top}}>{map.tiles.map(tile=><img key={`${tile.x}-${tile.y}`} src={`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`} alt="" draggable="false" style={{left:`${(tile.dx+1)*256}px`,top:`${(tile.dy+1)*256}px`}}/>)}</div>
    <div className="v412-map-shade"/>
    {showUserPin&&<><i className="v412-radar-ring r1"/><i className="v412-radar-ring r2"/><i className="v412-radar-ring r3"/><div className="v412-map-pin"><MapPin size={20}/></div></>}
    {clusters.map((cluster, index) => {
      const first = cluster.items[0]?.sentinel || {};
      const count = cluster.items.length;
      const detail = `${count} Sentinel ${count===1?'disponibile':'disponibili'} · ${sentinelDirection(cluster.items[0].bearingDeg)}`;
      return <button key={`sentinel-cluster-${index}`} type="button" onClick={()=>setSelectedCluster(cluster)} className={`v454-sentinel-marker ${sentinelMode?'sentinel-radar-marker':''} ${cluster.outOfView?'edge-marker':''}`} style={{left:`calc(50% + ${cluster.dx}px)`,top:`calc(50% + ${cluster.dy}px)`}} title={detail} aria-label={detail}>
        <img src="/sentinel-shield.png" alt="Sentinel"/>
        <i className={`state-${first.status||'available'}`}/>
        {count>1&&<b className="sentinel-count-badge">{count}</b>}
      </button>;
    })}
    <span className="sentinel-map-north" aria-label="Nord in alto">↑ N</span>
    {selectedCluster&&<div className="sentinel-map-detail" role="dialog" aria-label="Dettagli Sentinel"><strong>{selectedCluster.items.length} Sentinel disponibili</strong><p>Direzione: {sentinelDirection(selectedCluster.items[0].bearingDeg)}{selectedCluster.outOfView?' · oltre il bordo della mappa':''}</p><small>Il gruppo riunisce soltanto indicatori vicini nella stessa direzione. Fuori da un SOS non mostra coordinate precise.</small><button type="button" onClick={()=>setSelectedCluster(null)}>Chiudi</button></div>}
    <div className="v412-map-attribution">© OpenStreetMap contributors</div>
  </div>;
}
export default function MapScreen({ activeAlert, currentLocation, locationStatus, onRefreshLocation, t, language, plan='basic', networkIdentity }) {
  const location=activeAlert?.location||currentLocation,lat=Number(location?.latitude),lng=Number(location?.longitude),valid=location?.latitude!=null&&location?.longitude!=null&&Number.isFinite(lat)&&Number.isFinite(lng),isEmergency=Boolean(activeAlert?.active),isPro=plan==='pro',accuracy=Number(location?.accuracy),capturedAt=location?.capturedAt;
  const [sentinels,setSentinels]=useState([]);
  useEffect(()=>{ if(!isEmergency&&!valid&&locationStatus!=='checking') onRefreshLocation?.().catch(()=>{}); },[isEmergency,valid,locationStatus,onRefreshLocation]);
  useEffect(()=>{
    if (!networkIdentity?.authToken || !valid) { setSentinels([]); return undefined; }
    let alive=true; let running=false;
    const load=async()=>{
      if(!alive||running) return; running=true;
      try { const r=await getNearbySentinels(networkIdentity,{latitude:lat,longitude:lng}); if(alive)setSentinels(r?.sentinels||[]); }
      catch(error) { console.warn('[WALLAA][SENTINEL] nearby map', error?.message||error); }
      finally { running=false; }
    };
    const wake=()=>{ if(document.visibilityState==='visible') load(); };
    load(); const id=setInterval(load,10000);
    document.addEventListener('visibilitychange',wake); window.addEventListener('focus',load); window.addEventListener('online',load);
    return()=>{alive=false;clearInterval(id);document.removeEventListener('visibilitychange',wake);window.removeEventListener('focus',load);window.removeEventListener('online',load)};
  }, [networkIdentity?.authToken,lat,lng,valid]);
  return <div className="screen v4-generic-screen v402-map-screen"><header className="v402-screen-intro v402-map-intro"><div><span>{t('v4.map.eyebrow')}</span><h1>{t('v4.map.title')}</h1><p>{isEmergency?(isPro?t('v412.map.livePro'):t('v412.map.basicAlert')):t('v402.map.privateBody')}</p></div><button className="v402-add-button" onClick={()=>onRefreshLocation?.().catch(()=>{})} disabled={locationStatus==='checking'} aria-label={t('v402.map.refresh')}><RefreshCw size={20} className={locationStatus==='checking'?'spin':''}/></button></header>
    {location?.approximate && <p className="v402-privacy-note">Zona indicativa rilevata da un telefono della rete Wallaa.</p>}
    <section className={`v402-location-status ${isEmergency?'emergency':'ready'}`}><div className="v402-location-status-icon">{isEmergency?<ShieldCheck size={20}/>:<LocateFixed size={20}/>}</div><div><strong>{isEmergency?(isPro?t('v402.map.liveTracking'):t('v412.map.positionSent')):valid?t('v402.map.currentPosition'):t('v402.map.acquiring')}</strong><span>{isEmergency?(isPro?t('v402.map.sharedDuringAlert'):t('v412.map.basicNoTracking')):t('v402.map.notSharedNow')}</span></div><i/></section>
    <section className="v402-map-card v412-map-card"><LiveMap lat={valid?lat:NaN} lng={valid?lng:NaN} emergency={isEmergency} sentinels={sentinels}/>{<div className="v454-sentinel-overlay"><div className="v454-sentinel-legend"><img src="/sentinel-shield.png" alt=""/><span><b>Rete Sentinel</b><small>{sentinels.length?`${sentinels.length} disponibili · indicatori per direzione`:'Nessuna Sentinel disponibile rilevata'}</small></span></div></div>}
        <div className="v402-location-details"><div className="v402-coordinate-row"><div><small>{t('v402.map.latitude')}</small><strong>{valid?lat.toFixed(6):'—'}</strong></div><div><small>{t('v402.map.longitude')}</small><strong>{valid?lng.toFixed(6):'—'}</strong></div></div><div className="v402-location-meta"><span><Navigation size={14}/>{Number.isFinite(accuracy)?`± ${Math.round(accuracy)} m`:t('v402.map.accuracyUnknown')}</span><span>{capturedAt?new Date(capturedAt).toLocaleTimeString(language||undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—'}</span></div>{valid&&<a className="v402-open-maps" href={appleMapsUrl(lat,lng)} target="_blank" rel="noreferrer"><ExternalLink size={16}/>{t('v402.map.openAppleMaps')}</a>}</div></section><section className="v402-privacy-note"><ShieldCheck size={17}/><div><strong>{t('v402.map.privacyTitle')}</strong><p>{t('v412.map.privacyText')}</p></div></section></div>;
}
