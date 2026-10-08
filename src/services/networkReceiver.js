export function combineReceiverStatus(local={},native={}){
 const later=(a,b)=>Date.parse(a||'')>=Date.parse(b||'')?a:b||a||null;
 const lastDetectedAt=later(local.lastDetectedAt,native.lastDetectedAt),lastReportAt=later(local.lastReportAt,native.lastReportAt),lastFailureAt=later(local.lastFailureAt,native.lastFailureAt);
 const failed=Number.isFinite(Date.parse(lastFailureAt||''))&&(!lastReportAt||Date.parse(lastFailureAt)>Date.parse(lastReportAt));
 return {lastDetectedAt,lastReportAt,lastFailureAt,error:failed?(Date.parse(local.lastFailureAt||'')>=Date.parse(native.lastFailureAt||'')?local.error:`HTTP ${native.lastStatusCode||0}`):'',paused:native.paused===true};
}
