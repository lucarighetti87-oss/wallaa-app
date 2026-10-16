// Advertising may be silent while the authenticated SOS connection stays ready.
export function confirmedNativeLoss(status,now=Date.now(),delaySeconds=60){
 const at=Date.parse(status?.disconnectedAt),checked=Date.parse(status?.disconnectCheckedAt);
 return status?.connected!==true && status?.ready!==true && status?.disconnectConfirmed===true &&
  Number.isFinite(at) && Number.isFinite(checked) && checked>=at+5000 && now>=checked && now-checked<=10000 &&
  now-at>=Math.max(30,delaySeconds)*1000;
}
export function nativeLossEscalation(status,now=Date.now(),delaySeconds=60){
 return confirmedNativeLoss(status,now,delaySeconds) && now-Date.parse(status.disconnectedAt)>=(Math.max(30,delaySeconds)+601)*1000;
}
