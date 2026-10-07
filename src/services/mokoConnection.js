import { Capacitor, registerPlugin } from '@capacitor/core';
const native = registerPlugin('WallaaMoko');
let diagnosticMode=false;
export function isMokoDiagnosticRun(){return diagnosticMode;}
export function supportsMokoConnection() { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'; }
export async function configureMokoConnection({ hardwareId, enabled, password, useExistingPassword = false }) {
  if (!supportsMokoConnection()) return { supported: false };
  return native.configure({ hardwareId, enabled, ...(password ? { password } : {}), useExistingPassword });
}
export async function getMokoConnectionStatus(options={}) {
  if (!supportsMokoConnection()) return { state: 'unsupported', connected: false, ready: false };
  const status=await native.status(options);diagnosticMode=status.diagnostic===true;return status;
}

export async function beginMokoSetup(){if(supportsMokoConnection())await native.beginSetup();}
export async function endMokoSetup(options={}){if(supportsMokoConnection())await native.endSetup(options);}

export async function getSafetyPermissions(){return supportsMokoConnection()?native.permissions():{location:'not-determined',bluetooth:false,notifications:false,backgroundRefresh:false};}
export async function requestSafetyLocation(){if(supportsMokoConnection())return native.requestLocation();}
export async function openSafetySettings(){if(supportsMokoConnection())return native.openSettings();}
