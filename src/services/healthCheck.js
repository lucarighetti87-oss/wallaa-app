import {CONFIG} from '../config';
export async function healthRequest(path,{identity,method='GET',body}={}){
 const response=await fetch(`${CONFIG.apiBaseUrl}/api/health-check${path}`,{method,headers:{'Content-Type':'application/json','x-wallaa-legal-version':CONFIG.privacyPolicyVersion,'x-wallaa-installation-id':identity?.installationId||'','x-wallaa-install-token':identity?.authToken||''},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error(data.error||'Health Check non disponibile.'),{status:response.status});return data;
}
export const getHealthCheck=identity=>healthRequest('',{identity});
export const saveHealthCheck=(identity,body)=>healthRequest('/settings',{identity,method:'PATCH',body});
export const answerHealthCheck= (identity,id,answer,context)=>healthRequest(`/cycles/${encodeURIComponent(id)}/answer`,{identity,method:'POST',body:{answer,context}});
