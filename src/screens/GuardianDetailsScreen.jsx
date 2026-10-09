import {ArrowLeft,ChevronRight,Mail,Phone,Pencil,ShieldCheck,UserRound} from 'lucide-react';
import {uiText as u} from '../uiText';
export default function GuardianDetailsScreen({person,onBack,onEdit,onRemoveLink}){
 const editable=Boolean(person.id||person.guardianLinkId);
 const phone=person.phone?(person.phone.startsWith('+')||person.phone.startsWith('00')?person.phone:`${person.countryCode||''}${person.phone}`):'';
 const role=`${person.isWallaa?'W Guardian':'Guardian'}${person.role==='guardian_pro'?' Pro':person.role==='primary'?` · ${u('Principale')}`:''}`;
 return <div className="screen safety-guardian-details">
  <header className="guardian-detail-heading"><button type="button" onClick={onBack} aria-label={u('Indietro')}><ArrowLeft size={21}/></button><div><small>WALLAA CONNECT</small><h1>{u('Scheda Guardian')}</h1></div></header>
  <section className="guardian-detail-hero"><span className={`safety-avatar ${person.isWallaa?'wallaa':''}`}><UserRound size={30}/>{person.isWallaa&&<i>W</i>}</span><div><h2>{person.name}</h2><span>{role}</span><p>{person.receives&&person.protects?u('Vi proteggete a vicenda'):person.receives?u('Riceve i tuoi SOS'):u('Ricevi i suoi SOS')}</p></div></section>
  <section className="guardian-detail-data" aria-label={u('Dati del Guardian')}><h2>{u('Dati del Guardian')}</h2><dl>{[[u('Nome'),person.name],[u('Email'),person.email],[u('Telefono'),phone],[u('Codice cliente Wallaa'),person.isWallaa?person.customerId:u('Non usa Wallaa')]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||u('Non disponibile')}</dd></div>)}</dl>{person.isWallaa&&<p><ShieldCheck size={15}/>{u('Dati aggiornati dal profilo Wallaa.')}</p>}</section>
  {person.receives&&<section className="guardian-detail-permissions" aria-label={u('Cosa condivide il tuo account')}><h2>{u('Cosa condivide il tuo account')}</h2>{[['sosAlerts',u('Avvisi SOS')],['liveLocation',u('Posizione durante un SOS')],['disconnectAlerts',u('Avvisi di disconnessione')]].map(([key,label])=><div key={key}><span>{label}</span><strong className={person.permissions?.[key]===false?'off':'on'}>{person.permissions?.[key]===false?u('Disattivato'):u('Consentito')}</strong></div>)}</section>}
  {!person.receives&&<p className="guardian-detail-note">{u('Questa persona ha scelto di avvisarti. I suoi permessi sono gestiti dal suo account.')}</p>}
  <div className="guardian-detail-contact-actions">{phone&&<a href={`tel:${phone.replace(/[^+\d]/g,'')}`}><Phone size={18}/>{u('Chiama')}</a>}{person.email&&<a href={`mailto:${person.email}`}><Mail size={18}/>{u('Email')}</a>}</div>
  {editable&&<button type="button" className="guardian-detail-edit" onClick={()=>onEdit(person.id?person:{...person,linkId:person.guardianLinkId})}><Pencil size={18}/>{u('Modifica')}<ChevronRight size={18}/></button>}
  {!editable&&person.followingLinkId&&<button type="button" className="safety-link-remove" onClick={async()=>{await onRemoveLink(person.followingLinkId);onBack();}}>{u('Smetti di ricevere i suoi SOS')}</button>}
  <button type="button" className="guardian-detail-back" onClick={onBack}><ArrowLeft size={18}/>{u('Torna alla Rete di Sicurezza')}</button>
 </div>;
}
