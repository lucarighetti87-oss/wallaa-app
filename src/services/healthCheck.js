import {CONFIG} from '../config';
export async function healthRequest(path,{identity,method='GET',body}={}){
 let response;
 for(let attempt=0;attempt<(method==='GET'?2:1);attempt++){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   response=await fetch(`${CONFIG.apiBaseUrl}/api/health-check${path}`,{signal:controller.signal,method,headers:{'Content-Type':'application/json','x-wallaa-legal-version':CONFIG.privacyPolicyVersion,'x-wallaa-installation-id':identity?.installationId||'','x-wallaa-install-token':identity?.authToken||''},...(body===undefined?{}:{body:JSON.stringify(body)})});
   if(method==='GET'&&attempt===0&&[502,503,504].includes(response.status))continue;
   break;
  }catch(error){if(attempt===(method==='GET'?1:0))throw new Error('Collegamento a Health Check temporaneamente non disponibile. Riprova tra poco.');}
  finally{clearTimeout(timeout);}
 }
 const data=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error(data.error||'Health Check non disponibile.'),{status:response.status});return data;
}
export const getHealthCheck=identity=>healthRequest('',{identity});
export const saveHealthCheck=(identity,body)=>healthRequest('/settings',{identity,method:'PATCH',body});
export const answerHealthCheck= (identity,id,answer,context)=>healthRequest(`/cycles/${encodeURIComponent(id)}/answer`,{identity,method:'POST',body:{answer,context}});
