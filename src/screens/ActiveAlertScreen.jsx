import { useEffect, useMemo, useState } from 'react';
import { BellRing, Check, MapPin, Radio, UsersRound, X } from 'lucide-react';
import HoldToConfirmButton from '../components/HoldToConfirmButton';

function elapsedSince(value){ const start=new Date(value||Date.now()).getTime(); return Math.max(0,Math.floor((Date.now()-start)/1000)); }
function fmt(sec){const h=String(Math.floor(sec/3600)).padStart(2,'0');const m=String(Math.floor((sec%3600)/60)).padStart(2,'0');const s=String(sec%60).padStart(2,'0');return `${h}:${m}:${s}`;}

export default function ActiveAlertScreen({ alert, onSafe, onHome, busy }) {
  const [elapsed,setElapsed]=useState(()=>elapsedSince(alert?.at));
  useEffect(()=>{const id=setInterval(()=>setElapsed(elapsedSince(alert?.at)),1000);return()=>clearInterval(id)},[alert?.at]);
  const time=useMemo(()=>new Date(alert?.at||Date.now()).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}),[alert?.at]);
  if(!alert) return null;
  const delivered=(alert?.delivered?.length||0)+(alert?.pushDelivered?.length||0);
  return <div className="aa-focus aa-sos-active-screen">
    <div className="aa-sos-network-bg" aria-hidden="true"/>
    <header className="aa-sos-head"><button type="button" className="aa-wordmark compact aa-wordmark-home" onClick={onHome} aria-label="Torna alla Home"><img src="/wallaa-app-icon.png" alt="Wallaa"/><span><strong>Wallaa</strong><small>SAFETY</small></span></button><h1>SOS ATTIVO</h1><p>La nostra squadra è con te.</p></header>
    <section className="aa-live-sos"><div className="aa-emergency-rings"/><div className="aa-live-sos-core"><strong>SOS</strong><span>{fmt(elapsed)}</span></div></section>
    <section className="aa-sos-timeline">
      <div><i className="red"><BellRing/></i><time>{time}</time><span><strong>SOS attivato</strong><small>Segnale inviato alla centrale</small></span></div>
      <div><i><Radio/></i><time>+01</time><span><strong>Centrale operativa notificata</strong><small>La richiesta è stata presa in carico</small></span></div>
      <div><i className={delivered?'green':''}><UsersRound/></i><time>+02</time><span><strong>Contatti di emergenza avvisati</strong><small>{delivered?`${delivered} notifiche inviate`:'Invio in corso'}</small></span></div>
      <div><i className="green"><MapPin/></i><time>LIVE</time><span><strong>Posizione condivisa</strong><small>In tempo reale con centrale e contatti</small></span></div>
    </section>
    <HoldToConfirmButton className="aa-cancel-sos" duration={1600} onConfirm={onSafe} disabled={busy} ariaLabel="Chiudi SOS"><X/><strong>{busy?'Chiusura in corso…':'Sono al sicuro / chiudi SOS'}</strong></HoldToConfirmButton>
    <p className="aa-focus-note">La centrale è già stata allertata. Usa questo comando solo quando la situazione è realmente risolta.</p>
  </div>;
}
