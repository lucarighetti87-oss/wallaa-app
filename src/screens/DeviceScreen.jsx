import { ArrowLeft, BatteryMedium, Bluetooth, Check, ChevronRight, Radio, Shield } from 'lucide-react';
import WallaaButton3D from '../components/WallaaButton3D';
import { TRIGGERS } from '../config';

function signalLabel(value){return value||'—';}
function connectionLabel(status){if(status==='connected')return'Connesso';if(status==='standby')return'Pronto';if(status==='weak')return'Segnale debole';return'Disconnesso';}
function triggerLabel(value){return value.split('_').map((part)=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ');}
function triggerRings(value){
  const count = value === 'double_press' ? 2 : value === 'triple_press' ? 3 : 1;
  return <span className={`aa-trigger-rings count-${count}`} aria-hidden="true">{Array.from({length:count},(_,i)=><i key={i}/>)}</span>;
}

export default function DeviceScreen({ device, telemetry, pairingState, onPair, connectionStatus, signalQuality, trigger, onTrigger, onBack, onHome }) {
  if (!device) {
    const scanning = pairingState === 'scanning' || pairingState === 'press-detected';
    const detected = pairingState === 'press-detected';
    return <div className="aa-focus aa-pairing-screen">
      <header className="aa-pair-head"><button type="button" className="aa-pair-back" onClick={onBack} aria-label="Indietro"><ArrowLeft/></button><button type="button" className="aa-wordmark aa-wordmark-home" onClick={onHome} aria-label="Torna alla Home"><img src="/wallaa-app-icon.png" alt="Wallaa"/><span><strong>Wallaa</strong><small>SAFETY</small></span></button><span className="aa-pair-head-spacer"/></header>
      <h1>Collega il tuo Wallaa</h1><p>Collega il tuo Wallaa Safety Button in pochi semplici passaggi.<br/><b>Il collegamento non attiva l’SOS.</b></p>
      <div className={`aa-pair-device ${scanning?'ready':'offline'}`}><WallaaButton3D status={scanning?'connected':'disconnected'} size="lg"/></div>
      <section className="aa-pair-checks">
        <div className={scanning?'done':''}><i><Check/></i><span><strong>{scanning?'Dispositivo rilevato':'Pronto per la ricerca'}</strong><small>Wallaa Button</small></span><Radio/></div>
        <div className={detected?'done':''}><i><Check/></i><span><strong>Connessione sicura</strong><small>crittografata</small></span></div>
        <div className={detected?'done':''}><i><Check/></i><span><strong>Stato precedente azzerato</strong><small>Nessun falso allarme</small></span></div>
        <div className={pairingState==='paired'?'done':''}><i><Check/></i><span><strong>Dispositivo collegato con successo</strong><small>Pronto per l’uso</small></span></div>
      </section>
      <div className="aa-permanent-owner-notice">
        <Shield/>
        <span><strong>Associazione permanente</strong><small>Questo Wallaa Button verrà associato in modo permanente al tuo account. Una volta completata l’associazione, non potrà essere utilizzato con un altro account.</small></span>
      </div>
      <button className="aa-primary-glow" type="button" onClick={onPair} disabled={scanning}><Bluetooth/>{scanning?'Ricerca e associazione…':'Collega Wallaa Button'}</button>
      <small className="aa-pair-footer">Premi il Wallaa Button quando richiesto. La pressione usata per il pairing viene ignorata dal flusso SOS.</small>
    </div>;
  }

  const visualStatus = ['connected','standby'].includes(connectionStatus) ? 'connected' : connectionStatus === 'weak' ? 'weak' : 'disconnected';
  return <div className="aa-focus aa-device-screen aa-device-screen-v41">
    <header className="aa-device-screen-head">
      <button type="button" className="aa-device-back" onClick={onBack} aria-label="Indietro"><ArrowLeft/></button>
      <button type="button" className="aa-wordmark aa-wordmark-home" onClick={onHome} aria-label="Torna alla Home"><img src="/wallaa-app-icon.png" alt="Wallaa"/><span><strong>Wallaa</strong><small>SAFETY</small></span></button>
      <div className="aa-device-motto" aria-hidden="true"><span>PIÙ SICURI</span><span>OGNI GIORNO</span><i/></div>
    </header>

    <header className="aa-device-title">
      <span>DISPOSITIVO</span>
      <h1>Il mio Wallaa</h1>
      <p>Gestisci e controlla il tuo Safety Button.</p>
    </header>

    <section className="aa-device-detail aa-device-detail-v41">
      <div className={`aa-device-hero-visual state-${visualStatus}`}>
        <div className="aa-device-propagation" aria-hidden="true"><i/><i/><i/></div>
        <WallaaButton3D status={visualStatus} size="lg"/>
      </div>
      <div className="aa-device-hero-copy">
        <span className={`aa-connection ${visualStatus}`}><i/>{connectionLabel(connectionStatus)}</span>
        <h2>Wallaa Button</h2>
        <small>Dispositivo associato</small>
        <div className="aa-device-side-cta" aria-hidden="true"><ChevronRight/></div>
        <div className="aa-device-tagline"><i/><span>SEMPRE AL TUO FIANCO</span></div>
      </div>
    </section>

    <section className="aa-device-metrics aa-device-metrics-v41">
      <div><ChevronRight className="aa-metric-chevron"/><BatteryMedium/><small>Batteria</small><strong>{telemetry.battery!=null?`${telemetry.battery}%`:'—'}</strong></div>
      <div><ChevronRight className="aa-metric-chevron"/><Radio/><small>Segnale</small><strong>{signalLabel(signalQuality)}</strong></div>
      <div><ChevronRight className="aa-metric-chevron"/><Shield/><small>RSSI</small><strong>{telemetry.rssi!=null?`${telemetry.rssi} dBm`:'—'}</strong></div>
    </section>

    <section className="aa-trigger-card aa-trigger-card-v41">
      <div className="aa-trigger-watermark" aria-hidden="true"><i/><i/><i/><span>SOS</span></div>
      <span>COMANDO SOS</span>
      <h2>Gesto del pulsante</h2>
      <p>Scegli il gesto fisico che deve attivare una richiesta reale.</p>
      <div className="aa-trigger-list">
        {TRIGGERS.map((item)=>{
          const active = trigger===item.value;
          return <button type="button" key={item.value} className={active?'active':'inactive'} aria-pressed={active} onClick={()=>onTrigger?.(item.value)}>{triggerRings(item.value)}<span>{triggerLabel(item.value)}</span><span className={`aa-trigger-led ${active?'selected':'idle'}`} aria-hidden="true"><i/></span></button>;
        })}
      </div>
      <div className="aa-trigger-footer"><i/><span>PROTEZIONE IN UN GESTO</span><i/></div>
    </section>

    <div className="aa-device-owner-lock"><Shield/><span><strong>Wallaa Button registrato</strong><small>Questo dispositivo appartiene al tuo account.</small></span></div>
    <button className="aa-secondary-back" type="button" onClick={onBack}><ArrowLeft/>Torna alla Home</button>
  </div>;
}
