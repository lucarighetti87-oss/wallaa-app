import {useEffect,useState} from 'react';
import {storage} from '../services/storage';
export function isSentinelOn(state){
 return Boolean(state?.active===true&&state.available!==false&&String(state.status||'available').toLowerCase()!=='offline');
}
// The Home aura and all Wallaa logos share the same availability rule.
export function useSentinelMode(){
 const[active,setActive]=useState(false);
 useEffect(()=>{
  let cancelled=false;
  const refresh=async()=>{try{const state=await storage.getNativeSentinel();if(!cancelled)setActive(isSentinelOn(state));}catch{if(!cancelled)setActive(false);}};
  refresh();const timer=setInterval(refresh,1000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{cancelled=true;clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[]);
 return active;
}
