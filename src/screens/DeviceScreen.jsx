import { useEffect, useState } from 'react';
import { ArrowLeft, BatteryMedium, Bluetooth, Check, ChevronRight, Radio, Shield } from 'lucide-react';
import WallaaButton3D from '../components/WallaaButton3D';

import WallaaBrandShield from '../components/WallaaBrandShield';
function signalLabel(value){return ({Weak:'Debole',Medium:'Discreto',Strong:'Buono',Searching:'Ricerca',Standby:'In attesa'})[value]||value||'In attesa';}
function connectionLabel(status){if(status==='setup-required')return'Da configurare';if(status==='connected')return'Connesso';if(status==='searching')return'Collegamento in corso';if(status==='protection-off')return'Protezione disattivata';if(status==='standby')return'Pronto';if(status==='weak')return'Segnale debole';return'Disconnesso';}

export default function DeviceScreen({ onRefreshDevice, pairingError='', pendingMokoDevice, onResumeSetup, pairingCandidates = [], onSelectCandidate, onCancelPair, onMokoSetup, networkOwnedDevices = [], networkDevice, onNetworkTracking, mokoConnection, onMokoConfigure, device, telemetry, pairingState, onPair, connectionStatus, signalQuality, trigger, onTrigger, onBack, onHome }) {
  const [showDetails,setShowDetails]=useState(false);
  const [mokoPassword, setMokoPassword] = useState('');
  const isMoko=Boolean(device && (device.protocol==='moko-button'||device.hardwareId?.startsWith('MOKO:')||/^MK Button$/i.test(device.advertisedName||'')||!device.hardwareId||/^LEGACY-/i.test(device.hardwareId)));
  const signalTone=telemetry.rssi==null?'unknown':telemetry.rssi>=-65?'good':telemetry.rssi>=-79?'medium':'weak';
  const signalText={good:'Buono',medium:'Medio',weak:'Debole',unknown:'In attesa'}[signalTone];
  const needsSetup=isMoko && (!device.hardwareId?.startsWith('MOKO:')||device.mokoSetupVerified!==true);
  const setupLabels={scanning:'Accendi il pulsante e tienilo vicino all’iPhone.',found:'Pulsante rilevato.',selecting:'Seleziona il pulsante che vuoi collegare.',checking:'Verifica dell’associazione…',connecting:'Collegamento al pulsante…',authenticating:'Verifica del dispositivo…',awaiting_press:'Premi una volta il pulsante. Questa prova non invia SOS.',confirm_press:'Premi ancora una volta per confermare il collegamento. Non viene inviato un SOS.',claiming:'Associazione al tuo account…',configuring:'Wallaa sta applicando le impostazioni…',verifying:'Verifica delle impostazioni…',checking_signal:'Verifica del segnale…',restoring:'Verifica del collegamento finale…',incomplete:'Configurazione da completare. Premi Riprova.',password_error:'La password del pulsante è stata modificata. Inseriscila per continuare.'};
  const setupBusy=['scanning','found','selecting','checking','connecting','authenticating','awaiting_press','confirm_press','claiming','configuring','verifying','checking_signal','restoring'].includes(pairingState);
  useEffect(()=>()=>onCancelPair?.(),[onCancelPair]);
  const setupProgress=<>
    {pairingError && <p className="mk1-setup-status" role="alert">{pairingError}</p>}
    {setupLabels[pairingState] && <p className="mk1-setup-status" role="status">{setupLabels[pairingState]}</p>}
    {pairingState==='selecting' && <div className="mk1-candidates">{pairingCandidates.map(candidate=><button type="button" key={candidate.id} onClick={()=>onSelectCandidate?.(candidate)}><Bluetooth/><span>Pulsante vicino · {candidate.hardwareId?.slice(-4)}</span><small>Segnale {candidate.rssi??'—'} dBm</small></button>)}</div>}
    {pairingState==='password_error' && <label>Password del pulsante<input className="input" type="password" autoComplete="off" value={mokoPassword} onChange={event=>setMokoPassword(event.target.value)} placeholder="Solo se è stata modificata"/></label>}
    {setupBusy && <button type="button" className="aa-secondary-back" onClick={onCancelPair}>Annulla collegamento</button>}
  </>;

  const mokoLabels = {disabled:'Trasmissione Bluetooth', searching:'Ricerca del pulsante', connecting:'Collegamento in corso', authenticating:'Verifica del pulsante', synchronizing:'Premi una volta per sincronizzare, senza inviare SOS', ready:'Pronto: un click invia SOS', disconnected:'Pulsante scollegato', password_required:'Inserisci la password del pulsante', password_error:'Password del pulsante non corretta', connection_failed:'Collegamento non riuscito', unsupported:'Modalità non supportata', unavailable:'Connessione continua non disponibile in questa versione', bluetooth_disabled:'Bluetooth disattivato'};

  if (!device) {
    const scanning=setupBusy;
    const detected = pairingState === 'press-detected';
    return <div className="aa-focus aa-pairing-screen">
      <header className="aa-pair-head"><button type="button" className="aa-pair-back" onClick={onBack} aria-label="Indietro"><ArrowLeft/></button><button type="button" className="aa-wordmark aa-wordmark-home" onClick={onHome} aria-label="Torna alla Home"><WallaaBrandShield alt="Wallaa"/><span><strong>Wallaa</strong><small>SAFETY</small></span></button><span className="aa-pair-head-spacer"/></header>
      <h1>Collega il tuo Wallaa</h1><p>Collega il tuo Wallaa Safety Button in pochi semplici passaggi.<br/><b>Il collegamento non attiva l’SOS.</b></p>
      <div className={`aa-pair-device ${scanning?'ready':'offline'}`}><WallaaButton3D status={scanning?'connected':'disconnected'} size="lg"/></div>
      <section className="v4-settings-card"><h2>{scanning?'Collegamento in corso':'Collega il pulsante'}</h2><p>Accendi il pulsante e tienilo vicino all’iPhone. Premi una volta soltanto quando Wallaa lo richiede.</p></section>
      <div className="aa-permanent-owner-notice"><Shield/><span><strong>Il pulsante sarà legato al tuo account</strong><small>La pressione di conferma non invia un SOS.</small></span></div>
      {setupProgress}
      <button className="aa-primary-glow" type="button" onClick={()=>onPair?.({password:mokoPassword||undefined})} disabled={scanning}><Bluetooth/>{scanning?'Ricerca e associazione…':'Collega Wallaa Button'}</button>
      <small className="aa-pair-footer">Premi il Wallaa Button quando richiesto. La pressione usata per il pairing viene ignorata dal flusso SOS.</small>
    </div>;
  }

  if(showDetails)return <div className="aa-focus wb-device-details"><button type="button" className="aa-secondary-back" onClick={()=>setShowDetails(false)}><ArrowLeft/>Torna al pulsante</button><header><span>DIAGNOSTICA</span><h1>Dettagli WB-001</h1><p>Dati reali comunicati dal dispositivo e stato del collegamento.</p></header><section className="wb-card"><dl className="wb-diagnostics">{[
    ['Stato',connectionLabel(connectionStatus)],['Identificativo univoco',device.hardwareId?.replace('MOKO:','')||'Da verificare'],['ID del dispositivo',device.deviceCode||'Non comunicato'],['Seriale di fabbrica',device.serialNumber||'Non comunicato dal dispositivo'],['Firmware',device.firmwareVersion||'Non disponibile'],['Software',device.softwareVersion||'Non disponibile'],['Hardware',telemetry.hardwareVersion||'Non disponibile'],['Produzione',telemetry.productionDate||'Non disponibile'],['Batteria',telemetry.battery!=null?`${telemetry.battery}%`:'In attesa di lettura'],['Tensione',telemetry.batteryVoltageMv?`${telemetry.batteryVoltageMv} mV`:'In attesa di lettura'],['RSSI',<span className={`wb-signal ${signalTone}`}>{telemetry.rssi!=null?`${telemetry.rssi} dBm · ${signalText}`:'In attesa di lettura'}</span>],['Ultima lettura',telemetry.sampledAt?new Date(telemetry.sampledAt).toLocaleString():'In attesa di lettura'],['Profilo verificato',device.mokoSetupVerified?`Versione ${device.mokoProfileVersion||1}`:'Da completare']
  ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section><p className="wb-hint">Il codice Bluetooth identifica il pulsante; non viene presentato come un seriale di fabbrica. Un segnale debole può rendere instabile il collegamento: avvicina il pulsante e ripeti la verifica.</p></div>;

  const visualStatus = needsSetup?'disconnected':setupBusy?'weak':['connected','standby'].includes(connectionStatus) ? 'connected' : connectionStatus === 'weak' ? 'weak' : 'disconnected';
  return <div className="aa-focus aa-device-screen aa-device-screen-v41 wb-device-screen">
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
        <span className={`aa-connection ${visualStatus}`}><i/>{connectionLabel(needsSetup?'setup-required':connectionStatus)}</span>
        <h2>{isMoko?'WB-001':'Wallaa Button'}</h2>
        <small>{needsSetup?'Associazione da completare':'Associato al tuo account'}</small>
        <button type="button" className="aa-device-side-cta" aria-label="Apri dettagli WB-001" onClick={()=>setShowDetails(true)}><ChevronRight/></button>
        <div className="aa-device-tagline"><i/><span>SEMPRE AL TUO FIANCO</span></div>
      </div>
    </section>

    <section className="aa-device-metrics aa-device-metrics-v41">
      <div><BatteryMedium/><small>Batteria</small><strong>{telemetry.battery!=null?`${telemetry.battery}%`:telemetry.batteryVoltageMv?`${(telemetry.batteryVoltageMv/1000).toFixed(2)} V`:'In lettura'}</strong></div>
      <div><Radio/><small>Qualità segnale</small><strong className={`wb-signal ${signalTone}`}>{signalText}</strong></div>
      <div><Shield/><small>Signal</small><strong className={`wb-signal ${signalTone}`}>{telemetry.rssi!=null?`${telemetry.rssi} dBm`:'In attesa'}</strong></div>
    </section>

    {isMoko && <section className="wb-card wb-control-card">
      <h2>{device.hardwareId?.startsWith('MOKO:')?'Il tuo WB-001':'Completa il tuo pulsante'}</h2>
      {pendingMokoDevice && !setupBusy && <div><p>Il nuovo pulsante è associato al tuo account, ma il collegamento è da completare. Il pulsante precedente resta selezionato.</p><button type="button" className="v4-primary" onClick={()=>onResumeSetup?.({password:mokoPassword||undefined})}>Completa il nuovo collegamento</button></div>}
      <p>{needsSetup?'Completa il collegamento per usare l’SOS':mokoLabels[mokoConnection?.state]||'Verifica del collegamento'}</p>
      {needsSetup && <p>Wallaa controlla e configura il pulsante automaticamente.</p>}
      {setupProgress}
      {!setupBusy && <button type="button" className="v4-primary" onClick={()=>needsSetup?onMokoSetup?.({password:mokoPassword||undefined}):onRefreshDevice?.()}>{needsSetup?'Completa collegamento':'Aggiorna stato'}</button>}
      {['password_required','password_error'].includes(mokoConnection?.state) && pairingState!=='password_error' && <label>Password del pulsante<input className="input" type="password" autoComplete="off" value={mokoPassword} onChange={event=>setMokoPassword(event.target.value)} placeholder="Solo se è stata modificata"/></label>}
    </section>}

    <section className="aa-trigger-card aa-trigger-card-v41">
      <div className="aa-trigger-watermark" aria-hidden="true"><i/><i/><i/><span>SOS</span></div>
      <span>COMANDO SOS</span>
      <h2>Premi per inviare SOS</h2>
      <p>La prima pressione del pulsante può attivare l’SOS. Non serve premere più volte.</p>
      <div className="aa-trigger-footer"><i/><span>PROTEZIONE IN UN GESTO</span><i/></div>
    </section>

    {!setupBusy && <button type="button" className="aa-secondary-back" onClick={()=>onPair?.({password:mokoPassword||undefined})}><Bluetooth/>Associa un altro pulsante</button>}
    <div className="aa-device-owner-lock"><Shield/><span><strong>Wallaa Button registrato</strong><small>Questo dispositivo appartiene al tuo account.</small></span></div>
    <button className="aa-secondary-back" type="button" onClick={onBack}><ArrowLeft/>Torna alla Home</button>
  </div>;
}
