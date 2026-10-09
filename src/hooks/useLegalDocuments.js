import {useEffect,useState} from 'react';
import {CONFIG} from '../config';
export function useLegalDocuments(){
 const[docs,setDocs]=useState({privacy_policy:{version:CONFIG.privacyPolicyVersion,url:CONFIG.privacyPolicyUrl},terms:{version:CONFIG.termsVersion,url:CONFIG.termsUrl},safety_notice:{version:CONFIG.safetyNoticeVersion,url:CONFIG.safetyNoticeUrl}});
 useEffect(()=>{let cancelled=false;fetch(`${CONFIG.apiBaseUrl}/api/legal/documents`).then(r=>{if(!r.ok)throw new Error('Legal documents unavailable');return r.json();}).then(value=>{const items=value.documents;if(!cancelled&&['privacy_policy','terms','safety_notice'].every(key=>items?.[key]?.url?.startsWith('https://wallaasafety.com/legal/')&&items[key].version))setDocs(items);}).catch(()=>{});return()=>{cancelled=true;};},[]);
 return docs;
}
