import { useState } from 'react';
import { ArrowLeft, BatteryMedium, Bluetooth, Check, ChevronRight, Radio, Shield } from 'lucide-react';
import WallaaButton3D from '../components/WallaaButton3D';
import { TRIGGERS } from '../config';

import WallaaBrandShield from '../components/WallaaBrandShield';
function signalLabel(value){return value||'—';}
function connectionLabel(status){if(status==='connected')return'Connesso';if(status==='standby')return'Pronto';if(status==='weak')return'Segnale debole';return'Disconnesso';}
function triggerLabel(value){return value.split('_').map((part)=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ');}
function triggerRings(value){
  const count = value === 'double_press' ? 2 : value === 'triple_press' ? 3 : 1;
  return <span className={`aa-trigger-rings count-${count}`} aria-hidden="true">{Array.from({length:count},(_,i)=><i key={i}/>)}</span>;
}

export default function DeviceScreen({ networkOwnedDevices = [], networkDevice, onNetworkTracking, mokoConnection, onMokoConfigure, device, telemetry, pairingState, onPair, connectionStatus, signalQuality, trigger, onTrigger, onBack, onHome }) {
  const [mokoPassword, setMokoPassword] = useState('');
  const [mokoSaving, setMokoSaving] = useState(false);
  const mokoLabels = {disabled:'Trasmissione Bluetooth', searching:'Ricerca del pulsante', connecting:'Collegamento in corso', authenticating:'Verifica del pulsante', synchronizing:'Premi una volta per sincronizzare, senza inviare SOS', ready:'Pronto: un click invia SOS', disconnected:'Pulsante scollegato', password_required:'Inserisci la password del pulsante', password_error:'Password del pulsante non corretta', connection_failed:'Collegamento non riuscito', unsupported:'Modalità non supportata', unavailable:'Connessione continua non disponibile in questa versione', bluetooth_disabled:'Bluetooth disattivato'};

  if (!device) {
    const scanning = pairingState === 'scanning' || pairingState === 'press-detected';
    const detected = pairingState === 'press-detected';
    return <div className="aa-focus aa-pairing-screen">
      <header className="aa-pair-head"><button type="button" className="aa-pair-back" onClick={onBack} aria-label="Indietro"><ArrowLeft/></button><button type="button" className="aa-wordmark aa-wordmark-home" onClick={onHome} aria-label="Torna alla Home"><WallaaBrandShield alt="Wallaa"/><span><strong>Wallaa</strong><small>SAFETY</small></span></button><span className="aa-pair-head-spacer"/></header>
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
      {networkOwnedDevices.length > 0 && <section className="v4-settings-card">
        <h2>I tuoi pulsanti nella rete Wallaa</h2>
        <p>Puoi vedere gli avvistamenti anche da questo telefono, senza associare di nuovo il pulsante.</p>
        {networkOwnedDevices.map(item=><div key={item.hardwareId}>
          <strong>{item.name}</strong>
          {item.lastObservation ? <p><a href={item.lastObservation.mapsUrl} target="_blank" rel="noreferrer">Ultima zona rilevata</a> · {new Date(item.lastObservation.capturedAt).toLocaleString()}</p> : <p>{item.trackingEnabled?'Nessun avvistamento recente':'Localizzazione di rete disattivata'}</p>}
        </div>)}
      </section>}
      <small className="aa-pair-footer">Premi il Wallaa Button quando richiesto. La pressione usata per il pairing viene ignorata dal flusso SOS.</small>
    </div>;
  }

  const visualStatus = ['connected','standby'].includes(connectionStatus) ? 'connected' : connectionStatus === 'weak' ? 'weak' : 'disconnected';
  return <div className="aa-focus aa-device-screen aa-device-screen-v41">
    <header className="aa-device-screen-head">
      <button type="button" className="aa-device-back" onClick={onBack} aria-label="Indietro"><ArrowLeft/></button>
      <button type="button" className="aa-wordmark aa-wordmark-home" onClick={onHome} aria-label="Torna alla Home"><WallaaBrandShield alt="Wallaa"/><span><strong>Wallaa</strong><small>SAFETY</small></span></button>
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

    {device.hardwareId?.startsWith('MOKO:') && <section className="v4-settings-card">
      <h2>Connessione continua</h2>
      <p>{mokoLabels[mokoConnection?.state] || 'Verifica del collegamento'}</p>
      <p>Con questa modalità un click invia l’SOS. Gli altri gesti usano la trasmissione Bluetooth e devono essere abilitati anche sul pulsante.</p>
      <label className="v4-switch"><input type="checkbox" checked={device.mokoContinuousEnabled !== false} disabled={mokoSaving} onChange={async e => {
        setMokoSaving(true); try { await onMokoConfigure?.({enabled:e.target.checked}); } finally {setMokoSaving(false);}
      }}/><span/></label>
      <label>Password del pulsante<input className="input" type="password" autoComplete="off" value={mokoPassword} onChange={e=>setMokoPassword(e.target.value)} placeholder="Solo se hai cambiato la password di fabbrica"/></label>
      <button type="button" className="v4-primary" disabled={!mokoPassword || mokoSaving} onClick={async()=>{
        setMokoSaving(true); try {if (await onMokoConfigure?.({enabled:true,password:mokoPassword})) setMokoPassword('');} finally {setMokoSaving(false);}
      }}>Salva password del pulsante</button>
      <p>Movimento: {telemetry.motion == null ? 'in attesa di dati' : telemetry.motion ? 'rilevato' : 'fermo'}{telemetry.batteryVoltageMv ? ` · Batteria ${telemetry.batteryVoltageMv} mV` : ''}</p>
    </section>}

    {device.hardwareId?.startsWith('MOKO:') && <section className="v4-settings-card">
      <h2>Ritrova con la rete Wallaa</h2>
      <p>I telefoni degli utenti che partecipano alla rete possono segnalare il tuo pulsante quando lo rilevano nelle vicinanze.</p>
      <label className="v4-switch"><input type="checkbox" checked={networkDevice?.trackingEnabled === true} onChange={e=>onNetworkTracking?.(e.target.checked)}/><span/></label>
      {networkDevice?.unavailable && <p>La rete richiede l’aggiornamento del servizio Wallaa.</p>}
      {networkDevice?.lastObservation ? <div>
        <p>Ultimo rilevamento: {new Date(networkDevice.lastObservation.capturedAt).toLocaleString()}</p>
        <p>Zona approssimativa: circa {networkDevice.lastObservation.accuracy} m intorno al telefono che lo ha rilevato.</p>
        <a href={networkDevice.lastObservation.mapsUrl} target="_blank" rel="noreferrer">Apri la zona sulla mappa</a>
      </div> : <p>Nessun rilevamento recente dalla rete.</p>}
      <p>Il punto indica la posizione del telefono ricevente. La disponibilità dipende dai partecipanti presenti e dai permessi dei loro telefoni.</p>
    </section>}

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
