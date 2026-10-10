import {useCallback,useEffect,useRef,useState} from 'react';
import {getHealthCheck,saveHealthCheck,answerHealthCheck,healthRequest} from '../services/healthCheck';
import {getMokoConnectionStatus} from '../services/mokoConnection';
import {ensureLocalNotificationPermission} from '../services/nativeFeedback';
import {clearHealthNotifications} from '../services/push';
export function useHealthCheck({identity,device,profile,armed,loaded,visible}){
 const[data,setData]=useState({settings:{enabled:false,thresholdMinutes:30},sensor:{available:false,fresh:false},cycle:null});
 const[requested,setRequested]=useState(false);const[error,setError]=useState('');const[checking,setChecking]=useState(false);const[proof,setProof]=useState(null);
 const[history,setHistory]=useState([]);const historyAt=useRef(0);
 const generation=useRef(0),identityRef=useRef(identity),proofRef=useRef(null);identityRef.current=identity;
 const apply=useCallback(value=>{setData(value);setError('');if(value.cycle&&!value.cycle.needsAcknowledgement&&!['pending','escalating','email_pending','email_sent','email_no_recipients'].includes(value.cycle.status))clearHealthNotifications(value.cycle.id).catch(()=>{});return value;},[]);
 const refresh=useCallback(async()=>{if(!identityRef.current?.authToken)return;const current=++generation.current;const session=identityRef.current.authToken;try{const value=await getHealthCheck(identityRef.current);if(current===generation.current&&session===identityRef.current?.authToken)apply(value);if(Date.now()-historyAt.current>60000){historyAt.current=Date.now();try{const result=await healthRequest('/history',{identity:identityRef.current});if(session===identityRef.current?.authToken)setHistory(result.items||[]);}catch{historyAt.current=0;}}return value;}catch(e){if(current===generation.current)setError(e.message);return null;}},[apply]);
 useEffect(()=>{if(!loaded||!visible||!identity?.authToken)return;refresh();const timer=setInterval(refresh,8000);return()=>clearInterval(timer);},[loaded,visible,identity?.authToken,refresh]);
 useEffect(()=>{setHistory([]);historyAt.current=0;if(!identity?.authToken){setData({settings:{enabled:false,thresholdMinutes:30},sensor:{},cycle:null});setRequested(false);proofRef.current=null;setProof(null);}},[identity?.authToken]);
 useEffect(()=>{
  if(!loaded||!visible||!armed||!data.settings.enabled||profile?.plan!=='pro'||!identity?.authToken||!device?.claimToken)return;
  let lastSent=0,publishing=false;
  const activity=async event=>{
   if(!event.isTrusted||document.visibilityState==='hidden'||publishing||Date.now()-lastSent<15000)return;
   publishing=true;lastSent=Date.now();
   try{
    const result=await healthRequest('/phone-activity',{identity,method:'POST',body:{device:{hardwareId:device.hardwareId,claimToken:device.claimToken},at:new Date().toISOString(),source:'wallaa-interaction'}});
    if(!result.ignored){if(!result.needsAcknowledgement&&data.cycle?.id)await clearHealthNotifications(data.cycle.id).catch(()=>{});refresh();}
   }catch{}finally{publishing=false;}
  };
  window.addEventListener('pointerdown',activity,{passive:true});window.addEventListener('keydown',activity);
  return()=>{window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);};
 },[loaded,visible,armed,data.settings.enabled,profile?.plan,identity?.authToken,device?.hardwareId,device?.claimToken,data.cycle?.id,refresh]);
 useEffect(()=>{const listener=event=>{refresh();if(event.detail?.opened)setRequested(true);};window.addEventListener('wallaa:health-check',listener);return()=>window.removeEventListener('wallaa:health-check',listener);},[refresh]);
 const verify=useCallback(async()=>{
  if(!device?.hardwareId?.startsWith('MOKO:')||!device.claimToken)throw new Error('Collega un WB-001 per verificare il sensore.');
  setChecking(true);proofRef.current=null;setProof(null);const started=Date.now();
  try{
   let status=await getMokoConnectionStatus({refresh:true});
   while(Date.now()-started<9000){const telemetry=status.telemetry||{};const axes=telemetry.acceleration;
    if(status.ready===true&&telemetry.threeAxisAvailable===true&&axes&&['x','y','z'].every(k=>Number.isInteger(axes[k]))&&new Date(telemetry.motionSampledAt).getTime()>=started-1000){const next={available:true,sampledAt:telemetry.motionSampledAt};proofRef.current=next;setProof(next);return next;}
    if(telemetry.threeAxisAvailable===false)throw new Error('Questo WB-001 non comunica dati del sensore di movimento.');
    await new Promise(resolve=>setTimeout(resolve,500));status=await getMokoConnectionStatus();
   }
   throw new Error('Il sensore non ha risposto. Tieni il WB-001 vicino e riprova.');
  }finally{setChecking(false);}
 },[device?.hardwareId,device?.claimToken]);
 const save=useCallback(async changes=>{
  if(changes.enabled===true){if(proofRef.current&&Date.now()-Date.parse(proofRef.current.sampledAt)>60000)await verify();if(!armed)throw new Error('Attiva la protezione Wallaa prima di Health Check.');if(!await ensureLocalNotificationPermission())throw new Error('Attiva le notifiche Wallaa prima di usare Health Check.');}
  const value=await saveHealthCheck(identityRef.current,{...changes,device:{hardwareId:device?.hardwareId,claimToken:device?.claimToken},sensorProof:proofRef.current,context:{language:profile?.language||'it',safetyWord:profile?.safetyWord||'',locationSharingAllowed:profile?.sosLocationEnabled!==false}});return apply(value);
 },[device?.hardwareId,device?.claimToken,profile?.language,profile?.safetyWord,profile?.sosLocationEnabled,armed,apply,verify]);
 const answer=useCallback(async choice=>{if(!data.cycle?.id)throw new Error('Nessun controllo in attesa.');const value=await answerHealthCheck(identityRef.current,data.cycle.id,choice,{language:profile?.language||'it',safetyWord:profile?.safetyWord||'',locationSharingAllowed:profile?.sosLocationEnabled!==false});return apply(value);},[data.cycle?.id,apply,profile?.language,profile?.safetyWord,profile?.sosLocationEnabled]);
 const updateContext=useCallback(next=>healthRequest('/context',{identity:identityRef.current,method:'PATCH',body:{language:next.language||'it',safetyWord:next.safetyWord||'',locationSharingAllowed:next.sosLocationEnabled!==false}}),[]);
 return {data,history,requested,error,checking,proof,updateContext,refresh,verify,save,answer,open:()=>{historyAt.current=0;setRequested(true);refresh();},dismiss:()=>setRequested(false)};
}
