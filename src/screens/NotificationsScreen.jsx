import {useState} from 'react';
import { ArrowLeft, BellRing, CheckCircle2, MapPin, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react';
import { activityTitle, formatDateTime } from '../utils/format';

function IconFor({ entry }) {
  if (entry?.status === 'error') return <TriangleAlert size={18}/>;
  if (entry?.type === 'alert' || entry?.type === 'network-alert') return <BellRing size={18}/>;
  return <CheckCircle2 size={18}/>;
}

export default function NotificationsScreen({ activities = [], onClear, onBack, onOpenAlert, t, language }) {
  const [selected,setSelected]=useState(null),[error,setError]=useState('');
  async function open(entry){setSelected(entry);setError('');if(entry.alertId&&onOpenAlert){try{await onOpenAlert(entry.alertId);setSelected(null);}catch(e){setError(e.message||'Evento non disponibile.');}}}
  const rows = [...activities].sort((a,b) => new Date(b.at || 0) - new Date(a.at || 0));
  const unread = rows.filter((x) => x.type === 'alert' || x.type === 'network-alert').length;
  const handleClear = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    onClear?.();
  };

  return (
    <div className="aa-notifications-screen aa-notifications-screen-v38">
      <header className="aa-notifications-head aa-notifications-head-v38">
        <button type="button" onClick={onBack} aria-label="Indietro"><ArrowLeft/></button>
        <div className="aa-notifications-titleblock">
          <span>WALLAA CENTER</span>
          <h1>Notifiche</h1>
          <p>Avvisi, SOS e aggiornamenti di sicurezza.</p>
        </div>
        <div className="aa-notifications-count" aria-label={`${unread} notifiche di emergenza`}><BellRing/><b>{unread}</b></div>
      </header>

      <section className="aa-notifications-tools aa-notifications-tools-v38">
        <div className="aa-notifications-tool-copy"><ShieldCheck/><span><strong>Centro notifiche</strong><small>Ultimi 30 giorni</small></span></div>
        <button type="button" onClick={handleClear} disabled={!rows.length}><Trash2/><span>Cancella tutto</span></button>
      </section>

      {selected&&<div className="notification-detail-backdrop"><section className="notification-detail" role="dialog" aria-modal="true" aria-label="Dettagli notifica"><BellRing/><h2>{activityTitle(selected,language)}</h2><time>{formatDateTime(selected.at,language)}</time><p>{selected.detail||'Aggiornamento del tuo servizio Wallaa.'}</p>{error&&<p role="alert">{error}</p>}{selected.location?.mapsUrl&&<a href={selected.location.mapsUrl} target="_blank" rel="noreferrer">Apri posizione</a>}<button type="button" onClick={()=>setSelected(null)}>Chiudi dettagli</button></section></div>}
      <section className="aa-notifications-feed aa-notifications-feed-v38">
        {rows.map((entry) => {
          const title = activityTitle(entry, language);
          const emergency = entry.type === 'alert' || entry.type === 'network-alert';
          return (
            <article onClick={()=>open(entry)} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();open(entry);}}} role="button" tabIndex={0} aria-label={`Apri notifica: ${title}`} className={`aa-notification-row ${emergency?'emergency':''}`} key={entry.id}>
              <i><IconFor entry={entry}/></i>
              <div className="aa-notification-copy">
                <strong>{title}</strong>
                <small>{entry.detail || (emergency ? 'Aggiornamento sicurezza Wallaa' : 'Evento Wallaa')}</small>
                {entry.location?.mapsUrl && <a href={entry.location.mapsUrl} target="_blank" rel="noreferrer" onClick={event=>event.stopPropagation()}><MapPin size={13}/>Apri posizione</a>}
              </div>
              <time>{formatDateTime(entry.at, language)}</time>
            </article>
          );
        })}
        {!rows.length && <div className="aa-notifications-empty"><BellRing/><h2>Nessuna notifica</h2><p>Gli avvisi Wallaa e gli aggiornamenti di sicurezza compariranno qui.</p></div>}
      </section>
    </div>
  );
}
