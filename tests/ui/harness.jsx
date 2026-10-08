import {translate} from '../../src/i18n.js';
import V4BottomNav from '../../src/components/V4BottomNav.jsx';
import {setUiLanguage} from '../../src/uiText.js';
import React,{useCallback,useState} from 'react';
import {createRoot} from 'react-dom/client';
import SafetyPermissionGuide from '../../src/components/SafetyPermissionGuide.jsx';
import MapScreen from '../../src/screens/MapScreen.jsx';
import ChatScreen from '../../src/screens/ChatScreen.jsx';
import CentralSosChat from '../../src/components/CentralSosChat.jsx';
import NotificationsScreen from '../../src/screens/NotificationsScreen.jsx';
import IncomingAlert from '../../src/components/IncomingAlert.jsx';
import MessagesScreen from '../../src/screens/MessagesScreen.jsx';
import SettingsScreen from '../../src/screens/SettingsScreen.jsx';
import DeviceScreen from '../../src/screens/DeviceScreen.jsx';
import SentinelScreen from '../../src/screens/SentinelScreen.jsx';
import '../../src/styles.css';
import {installIOSViewportFix} from '../../src/utils/iosViewportFix.js';

const parameters=new URLSearchParams(location.search);
document.documentElement.dataset.theme=parameters.get('theme')||'dark';
installIOSViewportFix();
setUiLanguage(parameters.get('language')||'it');
const mode=parameters.get('mode')||'active';
const expiresAt=new Date(Date.now()+(mode==='expired'?-1000:mode==='expires'?2000:60000)).toISOString();
const offer={offerId:'ui-offer',incidentId:'ui-incident',routeDistanceM:1200,etaSeconds:240,expiresAt,opened:true};
// Every network call is answered locally. This harness must never send a real SOS.
let chatMessages=[];
window.fetch=async(input,options={})=>{
 const url=new URL(String(input),location.origin);let data;
 if(url.pathname.includes('/ui-chat/messages')||url.pathname==='/api/messages/conversations/ui-chat'||url.pathname==='/api/messages/central/ui-alert'){
  if(options.method==='POST'){
   if(parameters.has('sendError'))return new Response(JSON.stringify({error:'Invio di prova non riuscito'}),{status:503,headers:{'Content-Type':'application/json'}});
   const message={id:`msg-${chatMessages.length}`,body:JSON.parse(options.body).body,senderUserId:'ui-owner',createdAt:new Date().toISOString()};chatMessages.push(message);data={message};
  }else data={messages:chatMessages,conversation:{conversationType:'sentinel',closed:mode==='closed'},alert:{status:mode==='closed'?'closed':'active'}};
 }
 else if(url.pathname==='/api/messages/conversations')data={conversations:[{id:'ui-chat',name:'Marta Test',lastMessage:'Messaggio di prova',updatedAt:new Date().toISOString()}]};
 else if(url.pathname.includes('/api/messages/users')){
  const newer=parameters.has('race')&&url.searchParams.get('q')==='Marta';
  if(parameters.has('race'))await new Promise(resolve=>setTimeout(resolve,newer?20:650));
  data={users:[{userId:'ui-user',displayName:newer?'Marta Latest':'More Test',email:'more@example.invalid'}]};
 }
 else if(url.pathname==='/api/sentinel/me')data={enabled:true,profile:{verified:true,available:true,status:'available'}};
 else if(url.pathname==='/api/sentinel/nearby')data={sentinels:parameters.get('screen')==='map'?[0,90,180,270].map((bearingDeg,index)=>({id:`direction-${index}`,bearingDeg,edgeOnly:true,status:'available'})):[]};
 else if(url.pathname==='/api/sentinel/dispatch/current-incident')data={incident:null};
 else if(url.pathname==='/api/sentinel/dispatch/current-offer')data={offer:Date.parse(expiresAt)>Date.now()&&mode!=='closed'?offer:null,serverTime:new Date().toISOString()};
 else if(url.pathname==='/api/sentinel/dispatch/offers/ui-offer')data={offer:{...offer,actionable:false,reason:mode==='closed'?'sos_closed':'expired'},serverTime:new Date().toISOString()};
 else throw new Error(`Unexpected test request: ${url.pathname}`);
 return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
};

function Harness(){
 const[language,setLanguage]=useState(parameters.get('language')||'it');setUiLanguage(language);const t=(key,vars)=>translate(language,key,vars);
 const [push,setPush]=useState(offer);
 const [selected,setSelected]=useState(null);
 const clear=useCallback(()=>setPush(null),[]);
 const identity={installationId:'ui-test',authToken:'test-only',userId:'ui-owner'};
 if(parameters.get('screen')==='map')return <div className="app-shell-v4"><MapScreen currentLocation={{latitude:45,longitude:9}} networkIdentity={identity} t={t} language='it'/></div>;
 if(parameters.get('screen')==='guide')return <SafetyPermissionGuide status={{location:mode==='ready'?'always':'when-in-use',notifications:true,bluetooth:true}} onActivate={()=>{}} onFinish={()=>setSelected('finished')}/>;
 if(parameters.get('screen')==='chat')return <div className="app-shell-v4 screen-chat"><ChatScreen networkIdentity={identity} conversation={{id:'ui-chat',name:'Marta Test',conversationType:'sentinel'}} onBack={()=>{}}/></div>;
 if(parameters.get('screen')==='central')return <div className="app-shell-v4"><CentralSosChat networkIdentity={identity} alert={{id:'ui-alert',active:true}}/></div>;
 if(parameters.get('screen')==='notifications')return <NotificationsScreen activities={[{id:'entry',title:'WB-001 riconnesso',detail:'Collegamento ripristinato',at:new Date().toISOString()}]} language='it'/>;
 if(parameters.get('screen')==='incoming')return selected==='seen'?<button className="guardian-live-card" onClick={()=>setSelected(null)}>SOS ancora attivo · Marta Test</button>:<IncomingAlert alert={{id:'ui-alert',ownerName:'Marta Test',status:'active',remote:true,opened:true}} onClose={()=>setSelected('seen')} t={k=>k} language='it'/>;
 if(parameters.get('screen')==='settings')return <div className="app-shell-v4 screen-settings"><SettingsScreen device={{hardwareId:'MOKO:785005009F8B'}} networkDevice={{trackingEnabled:true}} profile={{language,plan:'pro'}} systemHealth={{status:'ready'}} networkState={{status:'ready'}} t={t} onSaveProfile={value=>setLanguage(value.language)} onNavigate={()=>{}}/><V4BottomNav active='settings' onChange={()=>{}}/></div>;
 if(parameters.get('screen')==='device')return <div className="app-shell-v4 screen-device"><main className="app-main-v4"><div className="screen-transition"><DeviceScreen device={parameters.has('empty')?null:{id:'test',protocol:parameters.has('legacy')?'bthome':'moko-button',hardwareId:parameters.has('legacyHash')?'LEGACY-TESTOLD':parameters.has('unidentified')?'':parameters.has('legacy')?'BTHOME:123':'MOKO:785005009F8B',mokoSetupVerified:!parameters.has('incomplete')}} telemetry={parameters.has('readings')?{battery:100,batteryVoltageMv:3054,rssi:Number(parameters.get('rssi')||-82),hardwareVersion:'MKBN Series',sampledAt:new Date().toISOString()}:{} } pairingError={parameters.has('setupError')?'Collegamento non riuscito. Ripeti la procedura.':''} pairingState={selected?'connecting':parameters.get('state')||'idle'} pairingCandidates={[{id:'near-one',hardwareId:'MOKO:785005009F8B',rssi:-67},{id:'near-two',hardwareId:'MOKO:785005009F76',rssi:-100}]} onSelectCandidate={setSelected} connectionStatus={parameters.has('incomplete')?'setup-required':'connected'} trigger='press' mokoConnection={{state:'ready'}} onCancelPair={()=>{}}/></div></main></div>;
 if(parameters.get('screen')==='sentinel')return <div className="app-shell-v4"><SentinelScreen networkIdentity={identity} sentinelOffer={push} clearSentinelOffer={clear} currentLocation={{latitude:45,longitude:9}} setToast={()=>{}} profile={{plan:'pro'}}/></div>;
 return <div className="app-shell-v4 screen-messages"><div className="app-main-v4"><div className="screen-transition"><MessagesScreen networkIdentity={identity} onOpenChat={()=>{}}/></div></div><nav className="v4-bottom-nav">Navigation</nav></div>;
}
createRoot(document.getElementById('root')).render(<Harness/>);
