import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';

const IMPACT = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy
};

export function impact(kind = 'light') {
  const style = IMPACT[kind] || IMPACT.light;
  Haptics.impact({ style }).catch(() => {
    try { navigator.vibrate?.(kind === 'heavy' ? [85, 45, 130] : kind === 'medium' ? 55 : 30); }
    catch { /* haptics must never block a safety flow */ }
  });
}

export function feedbackSuccess() {
  Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}

export function feedbackWarning() {
  Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
}

export async function ensureLocalNotificationPermission() {
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === 'granted';
  } catch {
    return false;
  }
}

function notificationId(seed = Date.now()) {
  // Capacitor requires a signed 32-bit integer identifier.
  const n = Math.abs(Number(seed) || Date.now()) % 2147483647;
  return Math.max(1, Math.trunc(n));
}

export async function showLocalSafetyNotification({ title, body, extra = null, id = Date.now(), sound = null }) {
  try {
    const permissions = await LocalNotifications.checkPermissions();
    if (permissions.display !== 'granted') return false;
    await LocalNotifications.schedule({
      notifications: [{
        id: notificationId(id),
        title,
        body,
        schedule: { at: new Date(Date.now() + 250) },
        sound: sound || null,
        attachments: null,
        actionTypeId: '',
        extra
      }]
    });
    return true;
  } catch {
    return false;
  }
}
