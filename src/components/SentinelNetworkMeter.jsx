import {useEffect,useRef,useState} from 'react';
import {uiText} from '../uiText';

// Qualitative coverage supplied by the service, never inferred from total registrations.
export default function SentinelNetworkMeter({level=null}){
 const ref=useRef(null),[visible,setVisible]=useState(false);
 const known=Number.isInteger(level)&&level>=0&&level<=4;
 const score=known?level:0;
 useEffect(()=>{
  let intersecting=false;
  const update=()=>setVisible(intersecting&&document.visibilityState==='visible');
  const observer=new IntersectionObserver(entries=>{intersecting=entries[0]?.isIntersecting===true;update();},{threshold:.1});
  if(ref.current)observer.observe(ref.current);
  document.addEventListener('visibilitychange',update);
  return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);};
 },[]);
 const labels=['Copertura Sentinel limitata','Copertura Sentinel limitata','Copertura Sentinel intermedia','Copertura Sentinel buona','Copertura Sentinel elevata'];
 return <section ref={ref} className={`sentinel-network-meter ${known?'':'is-unknown'} ${visible?'is-animating':''}`} style={{'--coverage-position':`${8+score*21}%`,'--coverage-hue':score*36}} aria-label={uiText('Rete Sentinel')}>
   <div className="sentinel-network-heading"><span className="sentinel-network-emblem" aria-hidden="true"><img src="/sentinel-shield.png" alt=""/></span><b>{uiText('Rete Sentinel')}</b><i className="sentinel-network-beacon" aria-hidden="true"/></div>
   <div className="sentinel-network-track" role="img" aria-label={uiText(known?labels[score]:'Copertura Sentinel da aggiornare')}>
     <div className="sentinel-network-spectrum"/>
     <div className="sentinel-network-grid"/>
     <div className="sentinel-network-flow"/>
     {known&&<span className="sentinel-network-lens"><i/></span>}
   </div>
   <div className="sentinel-network-reflection" aria-hidden="true"/>
 </section>;
}
