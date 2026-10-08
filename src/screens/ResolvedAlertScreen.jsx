import {uiText,uiLocale} from '../uiText.js';
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';
export default function ResolvedAlertScreen({ alert, onHome }){
  const when=alert?.resolvedAt?new Date(alert.resolvedAt):new Date(); const hh=when.toLocaleTimeString(uiLocale(),{hour:'2-digit',minute:'2-digit'});
  return <div className="aa-focus aa-resolved-screen">
    <div className="aa-resolved-globe" aria-hidden="true"/><header className="aa-focus-head simple"><button type="button" onClick={onHome}><ArrowLeft/></button><div><h1>{"" + uiText("Allarme risolto") + ""}</h1></div><span/></header>
    <div className="aa-shield-radar"><i/><i/><i/><div><ShieldCheck/></div></div>
    <h2>{"" + uiText("Sei al sicuro") + ""}</h2><p className="aa-resolved-lead">{alert?.resolvedBy==='operating-center'?uiText("L’allarme è stato chiuso dalla centrale operativa."):uiText("La richiesta di soccorso è stata chiusa.")}</p>
    <section className="aa-resolved-list"><div><i><Check/></i><span><strong>{"" + uiText("Allarme chiuso") + ""}</strong><small>{"" + uiText("dalla centrale operativa") + ""}</small></span><time>{hh}</time></div><div><i><Check/></i><span><strong>{"" + uiText("Sistema sincronizzato") + ""}</strong><small>{"" + uiText("con l’app") + ""}</small></span><time>{hh}</time></div><div><i><Check/></i><span><strong>{"" + uiText("Contatti informati") + ""}</strong><small>{"" + uiText("Allarme risolto") + ""}</small></span><time>{hh}</time></div></section>
    <div className="aa-thankyou">{"" + uiText("Grazie per aver scelto Wallaa.") + ""}<br/>{"" + uiText("Continuiamo a essere al tuo fianco, sempre.") + ""}</div>
    <button type="button" className="aa-primary-glow" onClick={onHome}>{"" + uiText("Torna alla Home") + ""}</button>
  </div>;
}
