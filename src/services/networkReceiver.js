export function combineReceiverStatus(local={},native={}){
 const later=(a,b)=>Date.parse(a||'')>=Date.parse(b||'')?a:b||a||null;
 const lastDetectedAt=later(local.lastDetectedAt,native.lastDetectedAt),lastReportAt=later(local.lastReportAt,native.lastReportAt),lastFailureAt=later(local.lastFailureAt,native.lastFailureAt);
 const failed=Number.isFinite(Date.parse(lastFailureAt||''))&&(!lastReportAt||Date.parse(lastFailureAt)>Date.parse(lastReportAt));
 return {lastDetectedAt,lastReportAt,lastFailureAt,error:failed?((Date.parse(local.lastFailureAt||'')||0)>=(Date.parse(native.lastFailureAt||'')||0)?local.error:(native.error||`HTTP ${native.lastStatusCode??0}`)):'',paused:native.paused===true};
}

export function receiverErrorText(error=''){
 const code=Number(/^HTTP (-?\d+)$/.exec(error)?.[1]);
 if(error==='HTTP -1')return 'Il telefono non ha ottenuto una posizione recente entro il tempo previsto. Invio da riprovare.';
 if(error==='HTTP 0')return 'Il servizio non ha risposto al tentativo di invio. Il telefono riproverà.';
 if(code===401)return 'La sessione Wallaa deve essere ripristinata. Apri nuovamente il tuo account.';
 if(code===403)return 'Il servizio non ha autorizzato la partecipazione alla rete. Verifica lo stato dell’account.';
 if(code===429)return 'Il servizio ha richiesto una pausa tra gli invii. Il telefono riproverà.';
 if(code>=500)return 'Il servizio Wallaa ha restituito un errore temporaneo. Il telefono riproverà.';
 if(error.startsWith('HTTP'))return `Il servizio non ha accettato il rilevamento (${error}).`;
 return error;
}
export function receiverLocationUsable(location,now=Date.now()){
 const at=Date.parse(location?.capturedAt);
 return Number.isFinite(at)&&Math.abs(now-at)<=15000&&Number.isFinite(location?.accuracy)&&location.accuracy>=0&&location.accuracy<=100;
}
export function receiverReportItems(items,location,now=Date.now()){
 const at=Date.parse(location?.capturedAt);
 return items.filter(item=>Number.isFinite(item.rssi)&&Math.abs(Date.parse(item.observedAt)-at)<=15000&&now-Date.parse(item.observedAt)<=60000);
}
