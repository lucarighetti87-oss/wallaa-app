import { Capacitor, registerPlugin } from '@capacitor/core';
const native = registerPlugin('WallaaMoko');
export function supportsMokoConnection() { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'; }
export async function configureMokoConnection({ hardwareId, enabled, password, useExistingPassword = false }) {
  if (!supportsMokoConnection()) return { supported: false };
  return native.configure({ hardwareId, enabled, ...(password ? { password } : {}), useExistingPassword });
}
export async function getMokoConnectionStatus() {
  if (!supportsMokoConnection()) return { state: 'unsupported', connected: false, ready: false };
  return native.status();
}
