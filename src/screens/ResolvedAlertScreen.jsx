import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';
export default function ResolvedAlertScreen({ alert, onHome }){
  const when=alert?.resolvedAt?new Date(alert.resolvedAt):new Date(); const hh=when.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
  return <div className="aa-focus aa-resolved-screen">
    <div className="aa-resolved-globe" aria-hidden="true"/><header className="aa-focus-head simple"><button type="button" onClick={onHome}><ArrowLeft/></button><div><h1>Allarme risolto</h1></div><span/></header>
    <div className="aa-shield-radar"><i/><i/><i/><div><ShieldCheck/></div></div>
    <h2>Sei al sicuro</h2><p className="aa-resolved-lead">{alert?.resolvedBy==='operating-center'?"L’allarme è stato chiuso dalla centrale operativa.":"La richiesta di soccorso è stata chiusa."}</p>
    <section className="aa-resolved-list"><div><i><Check/></i><span><strong>Allarme chiuso</strong><small>dalla centrale operativa</small></span><time>{hh}</time></div><div><i><Check/></i><span><strong>Sistema sincronizzato</strong><small>con l’app</small></span><time>{hh}</time></div><div><i><Check/></i><span><strong>Contatti informati</strong><small>Allarme risolto</small></span><time>{hh}</time></div></section>
    <div className="aa-thankyou">Grazie per aver scelto Wallaa.<br/>Continuiamo a essere al tuo fianco, sempre.</div>
    <button type="button" className="aa-primary-glow" onClick={onHome}>Torna alla Home</button>
  </div>;
}
