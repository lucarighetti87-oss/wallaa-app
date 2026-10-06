import { CONFIG } from '../config';
async function request(path,{identity,method='GET',body}={}) {
  const response=await fetch(`${CONFIG.apiBaseUrl}/api/device-network${path}`,{method,
    headers:{'Content-Type':'application/json','x-wallaa-installation-id':identity?.installationId||'','x-wallaa-install-token':identity?.authToken||''},
    ...(body ? {body:JSON.stringify(body)} : {})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Rete di localizzazione non disponibile.');
  return data;
}
export const setNetworkParticipation=(identity,enabled)=>request('/participation',{identity,method:'PATCH',body:{enabled}});
export const reportNetworkObservations=(identity,location,observations)=>request('/observations',{identity,method:'POST',body:{location,observations}});
export const getDeviceNetworkLocation=(identity,hardwareId)=>request(`/devices/${encodeURIComponent(hardwareId)}`,{identity});
export const setDeviceNetworkTracking=(identity,device,enabled)=>request(`/devices/${encodeURIComponent(device.hardwareId)}`,{identity,method:'PATCH',body:{enabled,claimToken:device.claimToken}});

export const getOwnedNetworkDevices=(identity)=>request('/devices',{identity});
