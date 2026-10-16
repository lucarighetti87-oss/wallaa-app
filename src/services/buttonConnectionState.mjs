// An actual dropped connection is never called connected merely because its last RSSI is recent.
export function nativeButtonConnectionState(status,now=Date.now()){
 if(status.connected===true&&status.ready!==false)return 'connected';
 if(status.state==='bluetooth_disabled')return 'disconnected';
 const at=Date.parse(status.disconnectedAt);
 if(Number.isFinite(at)){
  if(now-at<20000&&['connecting','authenticating','synchronizing','disconnected','connection_failed'].includes(status.state))return 'searching';
  return 'disconnected';
 }
 return 'searching';
}
