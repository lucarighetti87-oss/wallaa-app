import React,{useCallback,useState} from 'react';
import {createRoot} from 'react-dom/client';
import MessagesScreen from '../../src/screens/MessagesScreen.jsx';
import DeviceScreen from '../../src/screens/DeviceScreen.jsx';
import SentinelScreen from '../../src/screens/SentinelScreen.jsx';
import '../../src/styles.css';
import {installIOSViewportFix} from '../../src/utils/iosViewportFix.js';

const parameters=new URLSearchParams(location.search);
document.documentElement.dataset.theme=parameters.get('theme')||'dark';
installIOSViewportFix();
const mode=parameters.get('mode')||'active';
const expiresAt=new Date(Date.now()+(mode==='expired'?-1000:mode==='expires'?2000:60000)).toISOString();
const offer={offerId:'ui-offer',incidentId:'ui-incident',routeDistanceM:1200,etaSeconds:240,expiresAt,opened:true};
// Every network call is answered locally. This harness must never send a real SOS.
window.fetch=async(input)=>{
 const url=new URL(String(input),location.origin);let data;
 if(url.pathname==='/api/messages/conversations')data={conversations:[{id:'ui-chat',name:'Marta Test',lastMessage:'Messaggio di prova',updatedAt:new Date().toISOString()}]};
 else if(url.pathname.includes('/api/messages/users')){
  const newer=parameters.has('race')&&url.searchParams.get('q')==='Marta';
  if(parameters.has('race'))await new Promise(resolve=>setTimeout(resolve,newer?20:650));
  data={users:[{userId:'ui-user',displayName:newer?'Marta Latest':'More Test',email:'more@example.invalid'}]};
 }
 else if(url.pathname==='/api/sentinel/me')data={enabled:true,profile:{verified:true,available:true,status:'available'}};
 else if(url.pathname==='/api/sentinel/nearby')data={sentinels:[]};
 else if(url.pathname==='/api/sentinel/dispatch/current-incident')data={incident:null};
 else if(url.pathname==='/api/sentinel/dispatch/current-offer')data={offer:Date.parse(expiresAt)>Date.now()&&mode!=='closed'?offer:null,serverTime:new Date().toISOString()};
 else if(url.pathname==='/api/sentinel/dispatch/offers/ui-offer')data={offer:{...offer,actionable:false,reason:mode==='closed'?'sos_closed':'expired'},serverTime:new Date().toISOString()};
 else throw new Error(`Unexpected test request: ${url.pathname}`);
 return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
};

function Harness(){
 const [push,setPush]=useState(offer);
 const clear=useCallback(()=>setPush(null),[]);
 const identity={installationId:'ui-test',authToken:'test-only'};
 if(parameters.get('screen')==='device')return <DeviceScreen device={parameters.has('empty')?null:{id:'test',protocol:parameters.has('legacy')?'bthome':'moko-button',hardwareId:parameters.has('legacyHash')?'LEGACY-TESTOLD':parameters.has('unidentified')?'':parameters.has('legacy')?'BTHOME:123':'MOKO:785005009F8B',mokoSetupVerified:!parameters.has('incomplete')}} telemetry={{}} pairingState={parameters.get('state')||'idle'} connectionStatus={parameters.has('incomplete')?'setup-required':'connected'} trigger='press' mokoConnection={{state:'ready'}} onCancelPair={()=>{}}/>;
 if(parameters.get('screen')==='sentinel')return <div className="app-shell-v4"><SentinelScreen networkIdentity={identity} sentinelOffer={push} clearSentinelOffer={clear} currentLocation={{latitude:45,longitude:9}} setToast={()=>{}} profile={{plan:'pro'}}/></div>;
 return <div className="app-shell-v4 screen-messages"><div className="app-main-v4"><div className="screen-transition"><MessagesScreen networkIdentity={identity} onOpenChat={()=>{}}/></div></div><nav className="v4-bottom-nav">Navigation</nav></div>;
}
createRoot(document.getElementById('root')).render(<Harness/>);
