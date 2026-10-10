import {freshRadio} from '../services/radioTelemetry';
import {uiText,uiLocale} from '../uiText.js';
import { useEffect, useState } from 'react';
import { ArrowLeft, BatteryMedium, Bluetooth, Check, ChevronRight, Radio, Shield } from 'lucide-react';
import WallaaButton3D from '../components/WallaaButton3D';

import WallaaBrandShield from '../components/WallaaBrandShield';
function signalLabel(value){return ({Weak:uiText("Debole"),Medium:uiText("Discreto"),Strong:uiText("Buono"),Searching:uiText("Ricerca"),Standby:uiText("In attesa")})[value]||value||uiText("In attesa");}
function connectionLabel(status){if(status==='setup-required')return uiText("Da configurare");if(status==='connected')return uiText("Connesso");if(status==='searching')return uiText("Collegamento in corso");if(status==='protection-off')return uiText("Protezione disattivata");if(status==='standby')return uiText('Pronto');if(status==='weak')return uiText("Segnale debole");return uiText("Disconnesso");}

export default function DeviceScreen({ onRefreshDevice, pairingError='', pendingMokoDevice, onResumeSetup, pairingCandidates = [], onSelectCandidate, onCancelPair, onMokoSetup, networkOwnedDevices = [], networkDevice, onNetworkTracking, mokoConnection, onMokoConfigure, device, telemetry, pairingState, onPair, connectionStatus, signalQuality, trigger, onTrigger, onBack, onHome }) {
  const [showDetails,setShowDetails]=useState(false);
  const [mokoPassword, setMokoPassword] = useState('');
  const isMoko=Boolean(device && (device.protocol==='moko-button'||device.hardwareId?.startsWith('MOKO:')||/^MK Button$/i.test(device.advertisedName||'')||!device.hardwareId||/^LEGACY-/i.test(device.hardwareId)));
  const radioFresh=freshRadio(telemetry);
  const linkTone=connectionStatus==='connected'?'good':connectionStatus==='disconnected'?'weak':'medium';
  const batteryTone=telemetry.battery==null?'unknown':telemetry.battery<=15?'weak':telemetry.battery<=30?'medium':'good';
  const needsSetup=isMoko && (!device.hardwareId?.startsWith('MOKO:')||device.mokoSetupVerified!==true);
  const setupLabels={scanning:uiText("Accendi il pulsante e tienilo vicino all’iPhone."),found:uiText("Pulsante rilevato."),selecting:uiText("Seleziona il pulsante che vuoi collegare."),checking:uiText("Verifica dell’associazione…"),connecting:uiText("Collegamento al pulsante…"),authenticating:uiText("Verifica del dispositivo…"),awaiting_press:uiText("Premi una volta il pulsante. Questa prova non invia SOS."),confirm_press:uiText("Premi ancora una volta per confermare il collegamento. Non viene inviato un SOS."),claiming:uiText("Associazione al tuo account…"),configuring:uiText("Wallaa sta applicando le impostazioni…"),verifying:uiText("Verifica delle impostazioni…"),checking_signal:uiText("Verifica del segnale…"),restoring:uiText("Verifica del collegamento finale…"),incomplete:uiText("Configurazione da completare. Premi Riprova."),password_error:uiText("La password del pulsante è stata modificata. Inseriscila per continuare.")};
  const setupBusy=['scanning','found','selecting','checking','connecting','authenticating','awaiting_press','confirm_press','claiming','configuring','verifying','checking_signal','restoring'].includes(pairingState);
  useEffect(()=>()=>onCancelPair?.(),[onCancelPair]);
  const setupProgress=<>
    {pairingError && <p className="wb001-setup-status" role="alert">{pairingError}</p>}
    {setupLabels[pairingState] && <p className="wb001-setup-status" role="status">{setupLabels[pairingState]}</p>}
    {pairingState==='selecting' && <div className="wb001-candidates">{pairingCandidates.map(candidate=><button type="button" key={candidate.id} onClick={()=>onSelectCandidate?.(candidate)}><Bluetooth/><span>{"" + uiText("Pulsante vicino ·") + " "}{candidate.hardwareId?.slice(-4)}</span><small>{"" + uiText("Segnale") + " "}{candidate.rssi??'—'} dBm</small></button>)}</div>}
    {pairingState==='password_error' && <label>{"" + uiText("Password del pulsante") + ""}<input className="input" type="password" autoComplete="off" value={mokoPassword} onChange={event=>setMokoPassword(event.target.value)} placeholder={uiText("Solo se è stata modificata")}/></label>}
    {setupBusy && <button type="button" className="aa-secondary-back" onClick={onCancelPair}>{"" + uiText("Annulla collegamento") + ""}</button>}
  </>;

  const mokoLabels = {disabled:uiText("Trasmissione Bluetooth"), searching:uiText("Ricerca del pulsante"), connecting:uiText("Collegamento in corso"), authenticating:uiText("Verifica del pulsante"), synchronizing:uiText("Premi una volta per sincronizzare, senza inviare SOS"), ready:uiText("Pronto: un click invia SOS"), disconnected:uiText("Pulsante scollegato"), password_required:uiText("Inserisci la password del pulsante"), password_error:uiText("Password del pulsante non corretta"), connection_failed:uiText("Collegamento non riuscito"), unsupported:uiText("Modalità non supportata"), unavailable:uiText("Connessione continua non disponibile in questa versione"), bluetooth_disabled:uiText("Bluetooth disattivato")};

  if (!device) {
    const scanning=setupBusy;
    const detected = pairingState === 'press-detected';
    return <div className="aa-focus aa-pairing-screen">
      <header className="aa-pair-head"><button type="button" className="aa-pair-back" onClick={onBack} aria-label={uiText("Indietro")}><ArrowLeft/></button><button type="button" className="aa-wordmark aa-wordmark-home" onClick={onHome} aria-label={uiText("Torna alla Home")}><WallaaBrandShield alt="Wallaa"/><span><strong>Wallaa</strong><small>SAFETY</small></span></button><span className="aa-pair-head-spacer"/></header>
      <h1>{"" + uiText("Collega il tuo Wallaa") + ""}</h1><p>{"" + uiText("Collega il tuo Wallaa Safety Button in pochi semplici passaggi.") + ""}<br/><b>{"" + uiText("Il collegamento non attiva l’SOS.") + ""}</b></p>
      <div className={`aa-pair-device ${scanning?'ready':'offline'}`}><WallaaButton3D status={scanning?'connected':'disconnected'} size="lg"/></div>
      <section className="v4-settings-card"><h2>{scanning?uiText("Collegamento in corso"):uiText("Collega il pulsante")}</h2><p>{"" + uiText("Accendi il pulsante e tienilo vicino all’iPhone. Premi una volta soltanto quando Wallaa lo richiede.") + ""}</p></section>
      <div className="aa-permanent-owner-notice"><Shield/><span><strong>{"" + uiText("Il pulsante sarà legato al tuo account") + ""}</strong><small>{"" + uiText("La pressione di conferma non invia un SOS.") + ""}</small></span></div>
      {setupProgress}
      <button className="aa-primary-glow" type="button" onClick={()=>onPair?.({password:mokoPassword||undefined})} disabled={scanning}><Bluetooth/>{scanning?uiText("Ricerca e associazione…"):uiText("Collega Wallaa Button")}</button>
      <small className="aa-pair-footer">{"" + uiText("Premi il Wallaa Button quando richiesto. La pressione usata per il pairing viene ignorata dal flusso SOS.") + ""}</small>
    </div>;
  }

  if(showDetails)return <div className="aa-focus wb-device-details"><button type="button" className="aa-secondary-back" onClick={()=>setShowDetails(false)}><ArrowLeft/>{"" + uiText("Torna al pulsante") + ""}</button><header><span>{"" + uiText("DIAGNOSTICA") + ""}</span><h1>{"" + uiText("Dettagli WB-001") + ""}</h1><p>{"" + uiText("Dati reali comunicati dal dispositivo e stato del collegamento.") + ""}</p></header><section className="wb-card"><dl className="wb-diagnostics">{[
    [uiText("Modello produttore"),'MOKO H1 Keychain Beacon'],[uiText("Accelerometro"),telemetry.threeAxisAvailable===true?uiText("Presente"):telemetry.threeAxisAvailable===false?uiText("Non rilevato"):uiText("In attesa di lettura")],[uiText("Movimento"),telemetry.motionObserved===true?uiText("Movimento rilevato nel campione"):telemetry.motionObserved===false?uiText("Nessun movimento rilevato nel campione"):uiText("In attesa di lettura")],[uiText("Accelerazione"),telemetry.acceleration?`X: ${telemetry.acceleration.x} · Y: ${telemetry.acceleration.y} · Z: ${telemetry.acceleration.z} mg`:uiText("In attesa di lettura")],[uiText("Stato"),connectionLabel(connectionStatus)],[uiText("Identificativo univoco"),device.hardwareId?.replace('MOKO:','')||uiText("Da verificare")],[uiText("ID del dispositivo"),device.deviceCode||uiText("Non comunicato")],[uiText("Seriale di fabbrica"),device.serialNumber||uiText("Non comunicato dal dispositivo")],['Firmware',device.firmwareVersion||uiText("Non disponibile")],['Software',device.softwareVersion||uiText("Non disponibile")],['Hardware',telemetry.hardwareVersion||uiText("Non disponibile")],[uiText("Produzione"),telemetry.productionDate||uiText("Non disponibile")],[uiText("Batteria"),telemetry.battery!=null?`${telemetry.battery}%`:uiText("In attesa di lettura")],[uiText("Tensione"),telemetry.batteryVoltageMv?`${telemetry.batteryVoltageMv} mV`:uiText("In attesa di lettura")],[uiText('Fonte lettura radio'),uiText(telemetry.rssiSource==='connection'?'Connessione Bluetooth':telemetry.rssiSource==='advertisement'?'Trasmissione Bluetooth':'Non disponibile')],['RSSI',<span className="wb-signal radio-value">{radioFresh?`${telemetry.rssi} dBm`:uiText("In attesa di lettura")}</span>],[uiText("Ultima lettura"),telemetry.sampledAt?new Date(telemetry.sampledAt).toLocaleString(uiLocale()):uiText("In attesa di lettura")],[uiText("Profilo verificato"),device.mokoSetupVerified?uiText('Versione {count}',{count:device.mokoProfileVersion||1}):uiText("Da completare")]
  ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section><p className="wb-hint">{uiText("Signal misura l’intensità radio ricevuta: non indica una distanza in metri e non è, da solo, un test dell’SOS.")}</p><p className="wb-hint">{"" + uiText("Il codice Bluetooth identifica il pulsante; non viene presentato come un seriale di fabbrica. Un segnale debole può rendere instabile il collegamento: avvicina il pulsante e ripeti la verifica.") + ""}</p></div>;

  const visualStatus = needsSetup?'disconnected':setupBusy?'weak':['connected','standby'].includes(connectionStatus) ? 'connected' : connectionStatus === 'weak' ? 'weak' : 'disconnected';
  return <div className="aa-focus aa-device-screen aa-device-screen-v41 wb-device-screen">
    <header className="aa-device-screen-head">
      <button type="button" className="aa-device-back" onClick={onBack} aria-label={uiText("Indietro")}><ArrowLeft/></button>
      <button type="button" className="aa-wordmark aa-wordmark-home" onClick={onHome} aria-label={uiText("Torna alla Home")}><WallaaBrandShield alt="Wallaa"/><span><strong>Wallaa</strong><small>SAFETY</small></span></button>
      <div className="aa-device-motto" aria-hidden="true"><span>{"" + uiText("PIÙ SICURI") + ""}</span><span>{"" + uiText("OGNI GIORNO") + ""}</span><i/></div>
    </header>

    <header className="aa-device-title">
      <span>{"" + uiText("DISPOSITIVO") + ""}</span>
      <h1>{"" + uiText("Il mio Wallaa") + ""}</h1>
      <p>{"" + uiText("Gestisci e controlla il tuo Safety Button.") + ""}</p>
    </header>

    <section className="aa-device-detail aa-device-detail-v41">
      <div className={`aa-device-hero-visual state-${visualStatus}`}>
        <div className="aa-device-propagation" aria-hidden="true"><i/><i/><i/></div>
        <WallaaButton3D status={visualStatus} size="lg"/>
      </div>
      <div className="aa-device-hero-copy">
        <span className={`aa-connection ${visualStatus}`} aria-label={connectionLabel(needsSetup?'setup-required':connectionStatus)} title={connectionLabel(needsSetup?'setup-required':connectionStatus)}><i/>{needsSetup?uiText("Da configurare"):<Shield aria-hidden="true"/>}</span>
        <h2>{isMoko?'WB-001':uiText("Wallaa Button")}</h2>
        <small>{needsSetup?uiText("Associazione da completare"):uiText("Associato al tuo account")}</small>
        <button type="button" className="aa-device-side-cta" aria-label={uiText("Apri dettagli WB-001")} onClick={()=>{setShowDetails(true);onRefreshDevice?.();}}><ChevronRight/></button>
        <div className="aa-device-tagline"><i/><span>{"" + uiText("SEMPRE AL TUO FIANCO") + ""}</span></div>
      </div>
    </section>

    <section className="aa-device-metrics aa-device-metrics-v41">
      <div><BatteryMedium className={`wb-signal ${batteryTone}`}/><small>{"" + uiText("Batteria") + ""}</small><strong>{telemetry.battery!=null?`${telemetry.battery}%`:telemetry.batteryVoltageMv?`${(telemetry.batteryVoltageMv/1000).toFixed(2)} V`:uiText("In lettura")}</strong></div>
      <div aria-label={connectionLabel(connectionStatus)}><Radio className={`wb-signal ${linkTone}`}/><small>{uiText("Collegamento")}</small><strong className={`wb-signal ${linkTone}`} aria-hidden="true">●</strong></div>
      <div><Shield className={`wb-signal ${linkTone}`}/><small>Signal</small><strong className="wb-signal radio-value">{radioFresh?`${telemetry.rssi} dBm`:uiText("Da aggiornare")}</strong></div>
    </section>

    {isMoko && <section className="wb-card wb-control-card">
      <h2>{device.hardwareId?.startsWith('MOKO:')?uiText("Il tuo WB-001"):uiText("Completa il tuo pulsante")}</h2>
      {pendingMokoDevice && !setupBusy && <div><p>{"" + uiText("Il nuovo pulsante è associato al tuo account, ma il collegamento è da completare. Il pulsante precedente resta selezionato.") + ""}</p><button type="button" className="v4-primary" onClick={()=>onResumeSetup?.({password:mokoPassword||undefined})}>{"" + uiText("Completa il nuovo collegamento") + ""}</button></div>}
      <p>{needsSetup?uiText("Completa il collegamento per usare l’SOS"):mokoLabels[mokoConnection?.state]||uiText("Verifica del collegamento")}</p>
      {needsSetup && <p>{"" + uiText("Wallaa controlla e configura il pulsante automaticamente.") + ""}</p>}
      {setupProgress}
      {!setupBusy && <button type="button" className="v4-primary" onClick={()=>needsSetup?onMokoSetup?.({password:mokoPassword||undefined}):onRefreshDevice?.()}>{needsSetup?uiText("Completa collegamento"):uiText("Aggiorna stato")}</button>}
      {['password_required','password_error'].includes(mokoConnection?.state) && pairingState!=='password_error' && <label>{"" + uiText("Password del pulsante") + ""}<input className="input" type="password" autoComplete="off" value={mokoPassword} onChange={event=>setMokoPassword(event.target.value)} placeholder={uiText("Solo se è stata modificata")}/></label>}
    </section>}

    <section className="aa-trigger-card aa-trigger-card-v41">
      <div className="aa-trigger-watermark" aria-hidden="true"><i/><i/><i/><span>SOS</span></div>
      <span>{"" + uiText("COMANDO SOS") + ""}</span>
      <h2>{"" + uiText("Premi per inviare SOS") + ""}</h2>
      <p>{"" + uiText("La prima pressione del pulsante può attivare l’SOS. Non serve premere più volte.") + ""}</p>
      <div className="aa-trigger-footer"><i/><span>{"" + uiText("PROTEZIONE IN UN GESTO") + ""}</span><i/></div>
    </section>

    {!setupBusy && <button type="button" className="aa-secondary-back" onClick={()=>onPair?.({password:mokoPassword||undefined})}><Bluetooth/>{"" + uiText("Associa un altro pulsante") + ""}</button>}
    <div className="aa-device-owner-lock"><Shield/><span><strong>{"" + uiText("Wallaa Button registrato") + ""}</strong><small>{"" + uiText("Questo dispositivo appartiene al tuo account.") + ""}</small></span></div>
    <button className="aa-secondary-back" type="button" onClick={onBack}><ArrowLeft/>{"" + uiText("Torna alla Home") + ""}</button>
  </div>;
}
