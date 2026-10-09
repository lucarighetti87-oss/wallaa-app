import GuardianDetailsScreen from './GuardianDetailsScreen';
import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Plus, QrCode, RefreshCw, ScanLine, Shield, ShieldCheck, UserRound, X } from 'lucide-react';
import {uiText as u} from '../uiText';
import {safetyPeople} from '../services/safetyNetwork';

function NetworkScene(){
 return <div className="safety-scene safety-scene-cinematic safety-scene-stylized" aria-hidden="true">
  <img className="safety-cinematic-art" src="/guardian-network-stylized-v4.png" alt=""/>
  <div className="safety-central-energy"/><div className="safety-art-shade"/><div className="safety-holo-ring ring-front"/><div className="safety-holo-ring ring-back"/>
  <div className="safety-light-scan"/>
  <div className="safety-energy-particles">{Array.from({length:7},(_,n)=><i key={n} style={{'--particle':n}}/>)}</div>
  <span className="safety-cinematic-eyebrow">WALLAA GUARDIAN</span>
 </div>;
}
export default function NetworkScreen({profile={},contacts=[],networkState={},qrDataUrl,onScan,onRotate,onRemoveLink,onRefresh,onAdd,onEdit,onGuardianSettings,onBack}){
 const[showQr,setShowQr]=useState(false);const[detailsKey,setDetailsKey]=useState(null);const previousScroll=useRef(0);const people=useMemo(()=>safetyPeople(contacts,networkState),[contacts,networkState]);
 const ready=networkState.status==='ready';
 const details=people.find(person=>person.key===detailsKey);
 const openDetails=person=>{const main=document.querySelector('.app-main-v4');previousScroll.current=main?.scrollTop||0;setDetailsKey(person.key);requestAnimationFrame(()=>main?.scrollTo?.({top:0,behavior:'auto'}));};
 const closeDetails=()=>{setDetailsKey(null);requestAnimationFrame(()=>document.querySelector('.app-main-v4')?.scrollTo?.({top:previousScroll.current,behavior:'auto'}));};
 if(details)return <GuardianDetailsScreen person={details} onBack={closeDetails} onEdit={onEdit} onRemoveLink={onRemoveLink}/>;
 return <div className="screen safety-network-screen safety-network-cinematic">
  <header className="safety-heading"><button type="button" onClick={onBack} aria-label={u('Indietro')}><ArrowLeft size={19}/></button><div><span>WALLAA CONNECT</span><h1>{u('Rete di Sicurezza')}</h1><p>{u('Le persone su cui puoi contare, in un unico posto.')}</p></div><button type="button" onClick={onRefresh} aria-label={u('Aggiorna rete')}><RefreshCw size={19}/></button></header>
  <div className="safety-add-actions"><button type="button" className="safety-primary" onClick={onAdd}><Plus size={19}/>{u('Aggiungi persona')}</button><button type="button" onClick={onScan} disabled={!ready} aria-label={u('Scansiona QR')}><ScanLine size={19}/><span>QR</span></button><button type="button" onClick={()=>setShowQr(!showQr)} aria-expanded={showQr} aria-label={u('Il mio QR')}><QrCode size={20}/></button></div>
  <section className="safety-hero safety-hero-cinematic"><NetworkScene/><div className="safety-hero-summary"><span><strong>{people.length}</strong>{u('Persone nella tua rete')}</span><span><ShieldCheck size={15}/>{u('Posizione condivisa durante un SOS')}</span></div></section>
  {!ready&&<p className="safety-status" role="status">{u('Rete da aggiornare. Controlla la connessione e riprova.')}</p>}
  {showQr&&<section className="safety-qr-panel"><div><strong>{u('Il mio QR')}</strong><p>{u('Una scansione vi collega: ora vi proteggete a vicenda.')}</p><small>{networkState.customerId||profile.customerId||''}</small><button type="button" onClick={onRotate} disabled={!ready}>{u('Rigenera QR')}</button></div>{qrDataUrl&&<img src={qrDataUrl} alt={u('Il mio QR')}/>}</section>}
  <div className="safety-list-title"><h2>{u('Le tue persone')}</h2><span>{u('W = usa Wallaa')}</span></div>
  <div className="safety-people">{people.map((person,index)=><article key={person.key} className="safety-person" style={{'--arrival':`${index*70}ms`}}><button type="button" className="safety-person-main" onClick={()=>openDetails(person)} aria-label={u('Apri scheda di {name}',{name:person.name})}><span className={`safety-avatar ${person.isWallaa?'wallaa':''}`}><UserRound size={25}/>{person.isWallaa&&<i>W</i>}</span><span className="safety-person-copy"><strong>{person.name}</strong><small>{person.isWallaa?'W Guardian': 'Guardian'}{person.role==='guardian_pro'?' Pro':person.role==='primary'?` · ${u('Principale')}`:''}</small><em>{person.receives&&person.protects?u('Vi proteggete a vicenda'):person.receives?u('Riceve i tuoi SOS'):u('Ricevi i suoi SOS')}</em></span><ChevronRight size={18}/></button>{!person.isWallaa&&!person.email&&<p className="safety-person-note">{u('Aggiungi un’email per ricevere gli avvisi senza Wallaa.')}</p>}{!person.id&&person.guardianLinkId&&<button className="safety-link-remove" type="button" onClick={()=>onRemoveLink(person.guardianLinkId)}>{u('Rimuovi collegamento')}</button>}</article>)}</div>
  {!people.length&&<div className="safety-empty"><ShieldCheck size={30}/><h2>{u('Costruisci la tua rete')}</h2><p>{u('Aggiungi una persona tramite telefono, email, codice cliente o QR.')}</p></div>}

  <button type="button" className="safety-options" onClick={onGuardianSettings}><ShieldCheck size={20}/><span><strong>{u('Impostazioni di protezione')}</strong><small>{u('Permessi e protezione durante l’SOS')}</small></span><ChevronRight size={18}/></button>
 </div>;
}
