import {uiText,uiLocale} from '../uiText.js';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, Bluetooth, Check, Cloud, LoaderCircle, MapPin, Radio, ShieldCheck, Users, Wifi } from 'lucide-react';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function SecurityCheckScreen({
  authenticated,
  armed,
  device,
  connectionStatus,
  networkState,
  currentLocation,
  locationStatus,
  systemHealth,
  onRefreshSystemHealth,
  onBack
}) {
  const [phase, setPhase] = useState('running');
  const [completed, setCompleted] = useState(0);
  const [health, setHealth] = useState(systemHealth);

  const checks = useMemo(() => {
    const deviceLinked = Boolean(device?.id);
    const deviceReady = ['connected', 'standby', 'weak'].includes(connectionStatus);
    const pushReady = networkState?.pushPermission === 'granted';
    const networkReady = networkState?.status === 'ready';
    const guardianReady = (networkState?.guardians?.length || 0) > 0;
    const locationReady = Boolean(currentLocation?.latitude && currentLocation?.longitude) || ['ready', 'granted', 'available'].includes(locationStatus);
    const backendReady = health?.status === 'ready' && health?.ok !== false;

    return [
      { icon: ShieldCheck, title: uiText("App Wallaa"), detail: authenticated && armed ? uiText("Account e protezione attivi") : authenticated ? uiText("Account attivo · protezione disattivata") : uiText("Sessione non disponibile"), ok: Boolean(authenticated && armed) },
      { icon: Cloud, title: uiText("Servizi Wallaa"), detail: backendReady ? uiText("Backend e servizi raggiungibili") : health?.status === 'offline' ? uiText("Servizi non raggiungibili") : uiText("Verifica connessione ai servizi"), ok: backendReady },
      { icon: Bell, title: uiText("Notifiche"), detail: pushReady ? uiText("Notifiche push autorizzate") : uiText("Notifiche push da verificare"), ok: pushReady },
      { icon: MapPin, title: uiText("Posizione"), detail: locationReady ? uiText("Servizi di localizzazione disponibili") : uiText("Posizione non ancora disponibile"), ok: locationReady },
      { icon: Bluetooth, title: uiText("Wallaa Button"), detail: deviceLinked ? (deviceReady ? uiText("Dispositivo associato e operativo") : uiText("Associato · connessione da verificare")) : uiText("Nessun Wallaa Button associato"), ok: deviceLinked && deviceReady },
      { icon: Users, title: 'Safety Network', detail: networkReady ? (guardianReady ? uiText("{value0} Guardian collegati",{value0:(networkState.guardians.length)}) : uiText("Rete attiva · nessun Guardian")) : uiText("Rete Wallaa da verificare"), ok: networkReady && guardianReady }
    ];
  }, [authenticated, armed, device?.id, connectionStatus, networkState, currentLocation, locationStatus, health]);

  const healthyCount = checks.filter((item) => item.ok).length;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setPhase('running');
      setCompleted(0);
      try {
        const nextHealth = await onRefreshSystemHealth?.();
        if (!cancelled && nextHealth) setHealth(nextHealth);
      } catch {}
      for (let i = 1; i <= checks.length; i += 1) {
        await delay(i === 1 ? 420 : 360);
        if (cancelled) return;
        setCompleted(i);
      }
      if (!cancelled) setPhase('done');
    };
    run();
    return () => { cancelled = true; };
    // Run once when the diagnostic page opens. Results still react to live app state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = Math.round((completed / checks.length) * 100);
  const allGood = phase === 'done' && healthyCount === checks.length;

  return (
    <section className="w49-security-screen" aria-label={uiText("Controllo sicurezza Wallaa")}>
      <div className="w49-security-grid" aria-hidden="true" />
      <div className="w49-security-wrap">
        <header className="w49-security-heading">
          <span className="w49-security-kicker">{"" + uiText("DIAGNOSTICA LOCALE") + ""}</span>
          <h1>{"" + uiText("Controllo sicurezza") + ""}</h1>
          <p>{"" + uiText("Nessun SOS viene inviato. Wallaa verifica lo stato dei servizi essenziali dell’app.") + ""}</p>
        </header>

        <div className={`w49-scan-core ${phase === 'done' ? 'done' : ''}`} aria-live="polite">
          <span className="w49-scan-ring ring-a"/><span className="w49-scan-ring ring-b"/><span className="w49-scan-ring ring-c"/>
          <div className="w49-scan-center">
            {phase === 'running' ? <LoaderCircle className="w49-spin" size={42}/> : allGood ? <ShieldCheck size={44}/> : <Wifi size={44}/>}
            <strong>{phase === 'running' ? `${progress}%` : allGood ? uiText("Sistema pronto") : uiText("Verifica completata")}</strong>
            <small>{phase === 'running' ? uiText("Controllo in corso…") : uiText("{value0}/{value1} controlli operativi",{value0:(healthyCount),value1:(checks.length)})}</small>
          </div>
        </div>

        <div className="w49-security-list">
          {checks.map((item, index) => {
            const visible = completed > index;
            const Icon = item.icon;
            return (
              <div key={item.title} className={`w49-security-row ${visible ? 'visible' : 'waiting'} ${visible && item.ok ? 'ok' : visible ? 'warn' : ''}`}>
                <span className="w49-security-icon"><Icon size={20}/></span>
                <span><strong>{item.title}</strong><small>{visible ? item.detail : uiText("In attesa…")}</small></span>
                <i>{visible ? (item.ok ? <Check size={17}/> : '!') : <Radio size={16}/>}</i>
              </div>
            );
          })}
        </div>

        {phase === 'done' && (
          <div className={`w49-security-summary ${allGood ? 'ok' : 'warn'}`}>
            <ShieldCheck size={22}/>
            <span><strong>{allGood ? uiText("Wallaa è operativo") : uiText("Controllo completato")}</strong><small>{allGood ? uiText("I servizi principali risultano disponibili.") : uiText("Alcune voci richiedono attenzione, ma non è stato inviato alcun allarme.")}</small></span>
          </div>
        )}

        <button type="button" className="w49-back-home" onClick={onBack}><ArrowLeft size={20}/>{" " + uiText("Torna alla Home") + ""}</button>
      </div>
    </section>
  );
}
