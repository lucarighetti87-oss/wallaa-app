import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';
import { showLocalSafetyNotification, feedbackWarning } from './nativeFeedback';

let handles = [];
let guardianAlarmAudio = null;
const PUSH_TOKEN_KEY = 'wallaa.safe.push.token';

export async function stopPushListeners() {
  const current = handles;
  handles = [];
  await Promise.all(current.map((h) => h?.remove?.().catch?.(() => {}) || Promise.resolve()));
}

export async function initWallaaPush({ onToken, onAlert, onAlertClosed, onSentinelOffer, onMessage, onError } = {}) {
  if (!Capacitor.isNativePlatform()) return { supported: false, permission: 'web' };

  await stopPushListeners();

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt') permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') {
    return { supported: true, permission: permission.receive };
  }

  handles.push(await PushNotifications.addListener('registration', async (token) => {
    const value = token?.value || '';
    if (!value) return;
    try { await Preferences.set({ key: PUSH_TOKEN_KEY, value }); } catch { /* noop */ }
    onToken?.(value);
  }));
  handles.push(await PushNotifications.addListener('registrationError', async (error) => {
    try { await Preferences.remove({ key: PUSH_TOKEN_KEY }); } catch { /* noop */ }
    onError?.(error);
  }));
  handles.push(await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.info('[WALLAA][PUSH] received foreground', notification?.data?.type || 'unknown', notification?.data?.alertId || '');
    if (notification?.data?.type === 'wallaa_sos') {
      const alert = normalizePush(notification);
      feedbackWarning();
      playWallaaAlarm({ loop: true });
      // iOS does not necessarily present/sound a remote notification while the app is foreground.
      // Mirror it as a local notification with the bundled Guardian siren so foreground behaviour
      // matches lock-screen/background behaviour.
      showLocalSafetyNotification({
        title: notification?.title || `🚨 SOS da ${alert.ownerName}`,
        body: notification?.body || 'Emergenza Wallaa ricevuta. Tocca per aprire i dettagli.',
        extra: notification?.data || null,
        sound: 'wallaa-guardian-siren.wav'
      }).then((shown) => {
        console.info('[WALLAA][PUSH] local guardian fallback', shown ? 'scheduled' : 'not-authorized');
      }).catch((error) => {
        console.warn('[WALLAA][PUSH] local guardian fallback failed', error?.message || error);
      });
      onAlert?.(alert);
    }
    if (notification?.data?.type === 'wallaa_safe') onAlertClosed?.(notification?.data?.alertId || '');
    if (notification?.data?.type === 'wallaa_message') {
      const d = notification?.data || {};
      onMessage?.({
        conversationId:d.conversationId || '',
        senderUserId:d.senderUserId || '',
        opened:false
      });
    }
    if (notification?.data?.type === 'wallaa_sentinel_request') { feedbackWarning(); const d=notification?.data||{}; onSentinelOffer?.({ offerId:d.offerId||'', incidentId:d.incidentId||'', distanceM:Number(d.distanceM||0), createdAt:d.createdAt||new Date().toISOString() }); }
  }));
  handles.push(await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.info('[WALLAA][PUSH] notification action', action?.notification?.data?.type || 'unknown');
    const notification = action?.notification;
    if (notification?.data?.type === 'wallaa_sos') onAlert?.(normalizePush(notification));
    if (notification?.data?.type === 'wallaa_safe') onAlertClosed?.(notification?.data?.alertId || '');
    if (notification?.data?.type === 'wallaa_message') {
      const d = notification?.data || {};
      onMessage?.({
        conversationId:d.conversationId || '',
        senderUserId:d.senderUserId || '',
        opened:true
      });
    }
    if (notification?.data?.type === 'wallaa_sentinel_request') { feedbackWarning(); const d=notification?.data||{}; onSentinelOffer?.({ offerId:d.offerId||'', incidentId:d.incidentId||'', distanceM:Number(d.distanceM||0), createdAt:d.createdAt||new Date().toISOString() }); }
  }));

  // Re-register the last known APNs token on every app launch. APNs often returns the same
  // token and does not guarantee an app-level token change event for every backend redeploy.
  try {
    const cached = await Preferences.get({ key: PUSH_TOKEN_KEY });
    if (cached?.value) onToken?.(cached.value);
  } catch { /* noop */ }

  try { await PushNotifications.removeAllDeliveredNotifications(); } catch { /* noop */ }
  await PushNotifications.register();
  return { supported: true, permission: 'granted' };
}

function normalizePush(notification) {
  const data = notification?.data || {};
  const locationAllowed = String(data.locationShared ?? '1') !== '0';
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  const accuracy = data.accuracy == null || data.accuracy === '' ? null : Number(data.accuracy);
  const valid = locationAllowed && Number.isFinite(latitude) && Number.isFinite(longitude);

  return {
    id: data.alertId || `push-${Date.now()}`,
    remote: true,
    ownerName: data.userName || notification.title || 'Wallaa Safe Button',
    ownerPhone: data.userPhone || '',
    at: data.createdAt || new Date().toISOString(),
    trigger: data.trigger || 'sos',
    locationShared: locationAllowed,
    liveUrl: locationAllowed ? (data.liveUrl || '') : '',
    location: valid ? {
      latitude,
      longitude,
      accuracy: Number.isFinite(accuracy) ? accuracy : null,
      mapsUrl: data.mapsUrl || `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`
    } : null
  };
}

export function playWallaaAlarm({ loop = true } = {}) {
  try {
    stopWallaaAlarm();
    const audio = new Audio('/wallaa-guardian-siren.wav');
    audio.volume = 1;
    audio.loop = Boolean(loop);
    audio.preload = 'auto';
    guardianAlarmAudio = audio;
    audio.play().catch(() => { guardianAlarmAudio = null; });
  } catch {
    guardianAlarmAudio = null;
    // La push APNs con suono custom resta il fallback nativo quando l'app non può riprodurre audio.
  }
}

export function stopWallaaAlarm() {
  try {
    if (!guardianAlarmAudio) return;
    guardianAlarmAudio.pause();
    guardianAlarmAudio.currentTime = 0;
  } catch { /* noop */ }
  guardianAlarmAudio = null;
}

export async function clearDeliveredWallaaNotifications() {
  try { if (Capacitor.isNativePlatform()) await PushNotifications.removeAllDeliveredNotifications(); } catch { /* noop */ }
}
