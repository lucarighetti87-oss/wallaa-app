import {useHealthCheck} from './useHealthCheck';
import {observationDue} from '../services/observationCadence';
import {mergeMokoTelemetry} from '../services/radioTelemetry';
import {combineReceiverStatus} from '../services/networkReceiver';
import {buildButtonHeartbeat} from '../services/buttonHealth';
import { setNetworkParticipation, getOwnedNetworkDevices, reportNetworkObservations, getDeviceNetworkLocation, setDeviceNetworkTracking as saveDeviceNetworkTracking } from '../services/deviceNetwork';
import { prepareMokoButton } from '../services/mokoSetup';
import { MOKO_FACTORY_PASSWORD, MOKO_PROFILE_VERSION } from '../services/mokoSetupProtocol';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { configureMokoConnection, getMokoConnectionStatus, supportsMokoConnection, beginMokoSetup, endMokoSetup, isMokoDiagnosticRun, getSafetyPermissions, requestSafetyLocation, openSafetySettings } from '../services/mokoConnection';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { storage } from '../services/storage';
import { pairWallaaButton, captureMokoSetupBaseline, startWallaaMonitor, stopBleScan } from '../services/ble';
import { getCurrentLocation,getCachedLocation,requestLocationPermission, watchLiveLocation } from '../services/location';
import { sendWallaaAlert } from '../services/alert';
import { closeLiveAlert, deleteWallaaAccount, sendDeviceHeartbeat, updateLiveLocation, sendLiveProtectionLocation, sendAuthorizedLocationSnapshot, sendUniversalSentinelHeartbeat } from '../services/liveAlert';
import {
  createQrDataUrl, claimWallaaDevice, checkWallaaDeviceClaim, getWallaaNetwork, getWallaaContacts, getWallaaAccount, getWallaaLegalStatus, acceptWallaaLegalDocuments, getWallaaAlerts, getNetworkAlert, loginWallaaAccount, logoutWallaaAccount, registerWallaaAccount, registerWallaaIdentity, removeWallaaLink, rotateWallaaQr, scanQrWithCamera, scanWallaaCode, saveWallaaContact, deleteWallaaContact, syncWallaaContacts, getWallaaNotificationHistory, getActiveGuardianAlerts, acknowledgeActiveNetworkAlerts, clearWallaaNotificationHistory } from '../services/network';
import { clearDeliveredWallaaNotifications, initWallaaPush, playWallaaAlarm, stopPushListeners, stopWallaaAlarm } from '../services/push';
import { detectDeviceLanguage, translate } from '../i18n';
import { ensureLocalNotificationPermission, feedbackWarning, showLocalSafetyNotification } from '../services/nativeFeedback';
import { getWallaaSystemHealth, sendWallaaTestEmail } from '../services/system';
import { CONFIG, triggerMatches } from '../config';

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function newNetworkIdentity() {
  return { installationId: makeId(), userId: '', authToken: '', qrToken: '', qrPayload: '' };
}

function normalizeContact(input = {}) {
  return {
    id: input.id || makeId(),
    name: String(input.name || '').trim(),
    email: String(input.email || '').trim(),
    phone: String(input.phone || '').trim(),
    role: ['primary','guardian_pro'].includes(input.role) ? input.role : 'guardian',
    networkUserId: input.networkUserId || null,
    customerId: input.customerId || '',
    countryCode: input.countryCode || '',
    source: input.source || 'manual',
    permissions: {
      sosAlerts: input.permissions?.sosAlerts !== false,
      liveLocation: input.permissions?.liveLocation !== false,
      disconnectAlerts: input.permissions?.disconnectAlerts !== false
    }
  };
}

function profileName(profile = {}) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || profile.name || '';
}

export function useWallaaSafe() {
  const ACTIVITY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
function pruneActivities(items = []) {
  const cutoff = Date.now() - ACTIVITY_RETENTION_MS;
  return (items || []).filter((item) => {
    const when = new Date(item?.at || 0).getTime();
    return Number.isFinite(when) && when >= cutoff;
  }).slice(0, 150);
}

const defaultLanguage = useMemo(() => detectDeviceLanguage(), []);
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState({ customerId: '', name: '', firstName: '', lastName: '', email: '', phone: '', countryCode: '+39', birthCountry: '', birthPlace: '', safetyWord: '', language: defaultLanguage, plan: 'basic', networkObserverEnabled:true, sosLocationEnabled: true, liveProtectionEnabled: false, onboardingComplete: false });
  const [contacts, setContacts] = useState([]);
  const [device, setDevice] = useState(null);
  const [armed, setArmedState] = useState(true);
  const [trigger, setTriggerState] = useState('double_press');
  const [activities, setActivities] = useState([]);
  const [telemetry, setTelemetry] = useState({ battery: null, rssi: null, seenAt: null });
  const [networkOwnedDevices, setNetworkOwnedDevices] = useState([]);
  const [networkDevice, setNetworkDevice] = useState({trackingEnabled:false,lastObservation:null});
  const networkObservationBuffer = useRef(new Map());
  const networkLastSent=useRef(new Map());
  const networkPublish=useRef(null);
  const [receiverLocal,setReceiverLocal]=useState({});
  const [receiverNative,setReceiverNative]=useState({});
  const networkReceiverStatus=combineReceiverStatus(receiverLocal,receiverNative);
  const [mokoConnection, setMokoConnection] = useState({ state: 'disabled', connected: false, ready: false });
  const [pairingState, setPairingState] = useState('idle');
  const [pairingError,setPairingError]=useState('');
  const [pairingActive,setPairingActive]=useState(false);
  const [pairingCandidates,setPairingCandidates]=useState([]);
  const [pendingMokoDevice,setPendingMokoDevice]=useState(null);
  const pairingChoiceRef=useRef(null);
  const pairingControllerRef=useRef(null);
  const pairingInProgressRef=useRef(false);
  const [busy, setBusy] = useState(false);
  const [dispatchingAlert, setDispatchingAlert] = useState(false);
  const [dispatchStage, setDispatchStage] = useState('idle');
  const [toast, setToast] = useState(null);
  const [lastAlert, setLastAlert] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [resolvedAlert, setResolvedAlert] = useState(null);
  const [networkIdentity, setNetworkIdentity] = useState(null);
  const [networkState, setNetworkState] = useState({ status: 'loading', guardians: [], following: [], pushPermission: 'unknown' });
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [incomingAlert, setIncomingAlert] = useState(null);
  const [incomingAlertMinimized,setIncomingAlertMinimized] = useState(false);
  const [guardianAlerts,setGuardianAlerts] = useState([]);
  const [sentinelOffer, setSentinelOffer] = useState(null);
  const clearSentinelOffer = useCallback(() => setSentinelOffer(null), []);
  const [messagePush, setMessagePush] = useState(null);
  const [centralMessagePush, setCentralMessagePush] = useState(null);
  const [connectionGuard, setConnectionGuardState] = useState({ enabled: true, delaySeconds: 60 });
  const [showSafetyGuide,setShowSafetyGuide]=useState(false);
  const [safetyPermissions,setSafetyPermissions]=useState({});
  const [appearance, setAppearanceState] = useState({ mode: 'dark' });
  const [systemHealth, setSystemHealth] = useState({ status: 'idle' });
  const [legalStatus, setLegalStatus] = useState(null);
  const [legalChecked, setLegalChecked] = useState(false);
  const [legalError, setLegalError] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [clock, setClock] = useState(Date.now());
  const [appVisible, setAppVisible] = useState(() => typeof document === 'undefined' ? true : document.visibilityState !== 'hidden');

  const armedRef = useRef(armed);
  const triggerRef = useRef(trigger);
  const contactsRef = useRef(contacts);
  const profileRef = useRef(profile);
  const deviceRef = useRef(device);
  const telemetryRef = useRef(telemetry);
  const connectionGuardRef = useRef(connectionGuard);
  const activeAlertRef = useRef(activeAlert);
  const busyRef = useRef(false);
  const networkIdentityRef = useRef(null);
  const disconnectNotifiedRef = useRef(false);
  const nativeReadySinceRef=useRef(null);
  const profileUpgradeAttemptRef=useRef(null);
  const lastHeartbeatStatusRef = useRef('');
  const pushInitializedRef = useRef(false);
  const profileSyncTimerRef = useRef(null);
  const deviceClaimMigrationRef = useRef(false);

  const currentLanguage = useCallback(() => profileRef.current?.language || defaultLanguage, [defaultLanguage]);
  const tx = useCallback((key, vars) => translate(currentLanguage(), key, vars), [currentLanguage]);

  useEffect(() => { armedRef.current = armed; }, [armed]);
  useEffect(() => { triggerRef.current = trigger; }, [trigger]);
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { deviceRef.current = device; }, [device]);
  useEffect(()=>{setTelemetry({battery:null,rssi:null,seenAt:null});},[device?.hardwareId]);
  useEffect(() => { telemetryRef.current = telemetry; }, [telemetry]);
  useEffect(() => { connectionGuardRef.current = connectionGuard; }, [connectionGuard]);
  useEffect(() => { activeAlertRef.current = activeAlert; }, [activeAlert]);
  useEffect(() => { networkIdentityRef.current = networkIdentity; }, [networkIdentity]);

  // Give ownership of foreground BLE scanning to the JS monitor and background BLE
  // scanning to the native restoration manager. Leaving both CBCentralManagers scanning
  // while the app is backgrounded can make advertisement delivery less predictable.
  useEffect(() => {
    const syncVisibility = () => setAppVisible(document.visibilityState !== 'hidden');
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    globalThis.addEventListener?.('pageshow', syncVisibility);
    globalThis.addEventListener?.('focus', syncVisibility);
    globalThis.addEventListener?.('blur', syncVisibility);
    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      globalThis.removeEventListener?.('pageshow', syncVisibility);
      globalThis.removeEventListener?.('focus', syncVisibility);
      globalThis.removeEventListener?.('blur', syncVisibility);
    };
  }, []);


  const healthCheck=useHealthCheck({identity:networkIdentity,device,profile,armed,loaded,visible:appVisible});

  // Keep a native-readable safety snapshot in UserDefaults. The Swift CoreBluetooth
  // monitor uses this while the WebView is suspended (screen locked / another app open).
  useEffect(() => {
    if (!loaded) return;
    const config = {
      version: 2,
      armed: Boolean(armed) && device?.mokoSetupVerified !== false,
      trigger,
      apiUrl: CONFIG.apiUrl,
      deviceId: device?.id || '',
      hardwareId: device?.hardwareId || '',
      claimToken: device?.claimToken || '',
      profile: {
        firstName: profile?.firstName || '', lastName: profile?.lastName || '', name: profile?.name || '',
        phone: profile?.phone || '', safetyWord: profile?.safetyWord || '', language: profile?.language || 'en',
        liveProtectionEnabled: profile?.liveProtectionEnabled === true, sosLocationEnabled: profile?.sosLocationEnabled !== false, plan: profile?.plan || 'basic', networkObserverEnabled: profile?.networkObserverEnabled === true
      },
      contacts: (contacts || []).map((c) => ({
        name: c.name || '', email: c.email || '', phone: c.phone || '', role: c.role || 'guardian',
        permissions: c.permissions || { sosAlerts: true, liveLocation: true, disconnectAlerts: true }
      })),
      identity: {
        installationId: networkIdentity?.installationId || '',
        authToken: networkIdentity?.authToken || ''
      },
      connectionGuard,
      healthCheck:{enabled:healthCheck.data.settings?.enabled===true&&armed,thresholdMinutes:healthCheck.data.settings?.thresholdMinutes||30,nightMode:healthCheck.data.settings?.nightMode},
      savedAt: new Date().toISOString()
    };
    storage.setBackgroundConfig(config).catch(() => {});
  }, [loaded, armed, trigger, device?.id, device?.hardwareId, device?.claimToken, profile, contacts, networkIdentity?.installationId, networkIdentity?.authToken,healthCheck.data.settings?.enabled,healthCheck.data.settings?.thresholdMinutes,healthCheck.data.settings?.nightMode?.enabled,healthCheck.data.settings?.nightMode?.start,healthCheck.data.settings?.nightMode?.end,healthCheck.data.settings?.nightMode?.timeZone,connectionGuard]);

  // If a hardware SOS was sent natively while Wallaa was in background, restore the
  // active alert immediately when the WebView becomes visible again.
  useEffect(() => {
    if (!loaded) return undefined;
    let cancelled = false;
    const consumeNativeAlert = async () => {
      const nativeAlert = await storage.getNativeAlert();
      if (cancelled || !nativeAlert?.id) return;
      const restored = { ...nativeAlert, active: nativeAlert.active !== false };
      setLastAlert(restored);
      if (restored.active) {
        setActiveAlert(restored);
        activeAlertRef.current = restored;
        await storage.setActiveAlert(restored);
      }
      await storage.clearNativeAlert();
    };
    consumeNativeAlert().catch(() => {});
    const nativeTimer = setInterval(() => { if (document.visibilityState === 'visible') consumeNativeAlert().catch(() => {}); }, 1500);
    const onVisibility = () => { if (document.visibilityState === 'visible') consumeNativeAlert().catch(() => {}); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { cancelled = true; clearInterval(nativeTimer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [loaded]);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme='dark';
    document.documentElement.dataset.themePreference='dark';
    document.documentElement.style.colorScheme='dark';
  }, [appearance.mode]);

  const pushActivity = useCallback(async (entry) => {
    const row = { id: makeId(), at: new Date().toISOString(), ...entry };
    setActivities((current) => {
      const next = pruneActivities([row, ...current]);
      storage.setActivities(next).catch(() => {});
      return next;
    });
    return row;
  }, []);

  const networkRefreshGeneration=useRef(0);
  const refreshNetwork = useCallback(async (identity = networkIdentityRef.current) => {
    if (!identity?.authToken) return null;
    const generation=++networkRefreshGeneration.current;
    try {
      const state = await getWallaaNetwork(identity);
      if(generation!==networkRefreshGeneration.current)return state;
      if(Array.isArray(state.contacts)){const next=state.contacts.map(normalizeContact);if(JSON.stringify(next)!==JSON.stringify(contactsRef.current)){contactsRef.current=next;setContacts(next);await storage.setContacts(next);}}
      setNetworkState((current) => ({ ...current, ...state, status: 'ready' }));
      if (state.qrPayload) setQrDataUrl(await createQrDataUrl(state.qrPayload));
      return state;
    } catch (error) {
      setNetworkState((current) => ({ ...current, status: 'offline', error: error.message }));
      return null;
    }
  }, []);



  const refreshCurrentLocation = useCallback(async () => {
    setLocationStatus('checking');
    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
      setLocationStatus('ready');
      return location;
    } catch (error) {
      setLocationStatus('error');
      setToast({ type: 'error', text: error.message || 'Posizione non disponibile.' });
      throw error;
    }
  }, []);

  const refreshSystemHealth = useCallback(async () => {
    if (!networkIdentityRef.current?.authToken) { setSystemHealth({ status: 'idle' }); return null; }
    setSystemHealth((current) => ({ ...current, status: 'checking', error: '' }));
    try {
      const health = await getWallaaSystemHealth(networkIdentityRef.current);
      const next = { ...health, status: 'ready' };
      setSystemHealth(next);
      return next;
    } catch (error) {
      const next = { status: 'offline', error: error.message || 'Backend Wallaa non raggiungibile.' };
      setSystemHealth(next);
      return null;
    }
  }, []);

  const testAlarmSound = useCallback(() => {
    playWallaaAlarm({ loop: false });
  }, []);

  const sendTestEmail = useCallback(async () => {
    const email = profileRef.current?.email?.trim();
    if (!email) throw new Error(tx('v401.services.emailMissing'));
    try {
      const result = await sendWallaaTestEmail(networkIdentityRef.current, {
        email,
        name: profileName(profileRef.current) || 'Utente Wallaa'
      });
      setToast({ type: 'success', text: tx('v401.services.emailSent', { email }) });
      await refreshSystemHealth();
      return result;
    } catch (error) {
      setToast({ type: 'error', text: error.message || tx('v401.services.emailFailed') });
      throw error;
    }
  }, [refreshSystemHealth, tx]);

  const syncNetworkIdentity = useCallback(async ({ pushToken = null, baseIdentity = networkIdentityRef.current, nextProfile = profileRef.current } = {}) => {
    const identity = baseIdentity || newNetworkIdentity();
    if (!identity?.authToken) return identity;
    const displayName = profileName(nextProfile) || 'Utente Wallaa';
    try {
      const registered = await registerWallaaIdentity({
        identity, displayName, pushToken, platform: Capacitor.getPlatform(), profile: nextProfile
      });
      const next = {
        ...identity,
        userId: registered.userId || identity.userId,
        qrToken: registered.qrToken || identity.qrToken,
        qrPayload: registered.qrPayload || identity.qrPayload
      };
      setNetworkIdentity(next); networkIdentityRef.current = next;
      await storage.setNetworkIdentity(next);
      if (registered.profile) {
        const mergedProfile = { ...profileRef.current, ...registered.profile, safetyWord: profileRef.current?.safetyWord || '', sosLocationEnabled: profileRef.current?.sosLocationEnabled !== false };
        mergedProfile.name = profileName(mergedProfile);
        setProfile(mergedProfile); profileRef.current = mergedProfile;
        await storage.setProfile(mergedProfile);
      }
      if (registered.qrPayload) setQrDataUrl(await createQrDataUrl(registered.qrPayload));
      await refreshNetwork(next);
      // WALLAA_V4_0_58_QR_CONTACT_REFRESH
      await syncCloudContacts(networkIdentityRef.current).catch((error)=>console.warn('[WALLAA][QR] Guardian refresh failed',error?.message||error));
      return next;
    } catch (error) {
      setNetworkState((current) => ({ ...current, status: 'offline', error: error.message }));
      return identity;
    }
  }, [refreshNetwork]);

  const syncCloudContacts = useCallback(async (identity = networkIdentityRef.current) => {
    if (!identity?.authToken) return contactsRef.current;
    try {
      const cloud = await getWallaaContacts(identity);
      const cloudContacts = Array.isArray(cloud?.contacts) ? cloud.contacts.map(normalizeContact) : [];
      if(!cloudContacts.length && contactsRef.current.length)await storage.setContactsRecovery({savedAt:new Date().toISOString(),userId:identity.userId,contacts:contactsRef.current});
      setContacts(cloudContacts);
      contactsRef.current = cloudContacts;
      await storage.setContacts(cloudContacts);
      return cloudContacts;
    } catch (error) {
      console.warn('Wallaa contacts cloud sync skipped:', error?.message || error);
    }
    return contactsRef.current;
  }, []);

  const initializeAccountServices = useCallback(async (baseIdentity = networkIdentityRef.current, nextProfile = profileRef.current) => {
    if (!baseIdentity?.authToken) return baseIdentity;
    const synced = await syncNetworkIdentity({ baseIdentity, nextProfile });
    await syncCloudContacts(synced);
    await refreshSystemHealth();
    if (pushInitializedRef.current) return synced;
    pushInitializedRef.current = true;
    try {
      const push = await initWallaaPush({
        onToken: (token) => syncNetworkIdentity({ pushToken: token, baseIdentity: networkIdentityRef.current, nextProfile: profileRef.current }),
        onAlert: (alert) => {
          if (alert?.opened) {
            stopWallaaAlarm();
            clearDeliveredWallaaNotifications().catch(() => {});
          } else {
            playWallaaAlarm();
          }
          setIncomingAlertMinimized(false);
          setIncomingAlert({...alert,status:'active'});
          pushActivity({ type: 'network-alert', status: 'error', titleKey: 'activity.networkSos', titleVars: { name: alert.ownerName }, alertId:alert.id, location: alert.location }).catch(() => {});
        },
        onSentinelOffer: (offer) => setSentinelOffer(offer),
        onMessage: (message) => {
          setMessagePush({
            ...message,
            receivedAt: Date.now()
          });
        },
        onCentralMessage:payload=>setCentralMessagePush({...payload,receivedAt:Date.now()}),
        onAlertClosed: (alertId) => {
          stopWallaaAlarm();
          setIncomingAlert((current) => (!alertId || current?.id === alertId) ? null : current);
          const ownAlert = activeAlertRef.current;
          if (ownAlert?.id && (!alertId || ownAlert.id === alertId)) {
            const resolved = { ...ownAlert, active: false, status: 'closed', resolvedBy: 'operating-center', resolvedAt: new Date().toISOString() };
            setResolvedAlert(resolved);
            setActiveAlert(null); activeAlertRef.current = null;
            storage.setActiveAlert(null).catch(() => {});
          }
          clearDeliveredWallaaNotifications().catch(() => {});
          pushActivity({ type: 'network-alert-closed', status: 'success', title: 'Allarme terminato' }).catch(() => {});
        },
        onError: (error) => setToast({ type: 'error', text: error?.message || tx('error.pushUnavailable') })
      });
      if(push.permission!=='granted')pushInitializedRef.current=false;
      setNetworkState((current) => ({ ...current, pushPermission: push.permission }));
    } catch {
      pushInitializedRef.current = false;
      if (profileSyncTimerRef.current) clearTimeout(profileSyncTimerRef.current);
      setNetworkState((current) => ({ ...current, pushPermission: 'error' }));
    }
    return synced;
  }, [pushActivity, refreshSystemHealth, syncCloudContacts, syncNetworkIdentity, tx]);

  const fireAlert = useCallback(async (event = 'manual_test', meta = {}) => {
    if(!['manual_test','manual_sos'].includes(event) && (pairingInProgressRef.current || deviceRef.current?.mokoSetupVerified===false))return null;
    if(!['manual_test','manual_sos'].includes(event) && deviceRef.current?.hardwareId?.startsWith('MOKO:')){if(isMokoDiagnosticRun()){console.info('[WALLAA][MOKO] diagnostic foreground press received');return null;}}
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    if (event !== 'manual_test') {
      setDispatchStage('sending');
      setDispatchingAlert(true);
    }

    await pushActivity({
      type: 'trigger',
      status: 'success',
      titleKey: event === 'manual_test' ? 'activity.testStarted' : 'activity.buttonDetected',
      trigger: event
    });

    try {
      const result = await sendWallaaAlert({
        profile: profileRef.current,
        contacts: contactsRef.current,
        trigger: event,
        device: deviceRef.current,
        networkIdentity: networkIdentityRef.current,
        eventPacketId: meta?.packetId ?? null,
        locationEnabled: profileRef.current?.sosLocationEnabled !== false,
        onProgress: event === 'manual_test' ? null : (stage) => setDispatchStage(stage)
      });

      const alertResult = {
        id: result.alertId || makeId(),
        at: new Date().toISOString(),
        trigger: event,
        location: result.location,
        delivered: result.delivered || [],
        failed: result.failed || [],
        pushDelivered: result.pushDelivered || [],
        pushFailed: result.pushFailed || [],
        noPersonalGuardians: Boolean(result.noPersonalGuardians),
        operatingCenterDelivered: Boolean(result.operatingCenterDelivered),
        liveToken: result.liveToken || '',
        liveUrl: result.liveUrl || '',
        active: Boolean(result.alertId && event !== 'manual_test')
      };
      setLastAlert(alertResult);

      if (alertResult.active) {
        setActiveAlert(alertResult);
        activeAlertRef.current = alertResult;
        await storage.setActiveAlert(alertResult);
      }

      await pushActivity({
        type: 'alert', status: 'success', titleKey: 'activity.alertSent', trigger: event,
        location: result.location,
        deliveredCount: alertResult.delivered.length,
        pushDeliveredCount: alertResult.pushDelivered.length,
        failedCount: alertResult.failed.length + alertResult.pushFailed.length
      });

      if (event !== 'manual_test' && result.noPersonalGuardians) {
        setToast({ type: 'warning', text: result.operatingCenterDelivered ? tx('v410.toast.noGuardiansCenterSent') : tx('v410.toast.noGuardians') });
      } else {
        setToast({ type: 'success', text: tx('toast.alertSuccess') });
      }
      if (event !== 'manual_test') {
        setDispatchStage('complete');
      }
      return alertResult;
    } catch (error) {
      await pushActivity({ type: 'alert', status: 'error', titleKey: 'activity.alertFailed', trigger: event, detail: error.message });
      setToast({ type: error?.code === 'NO_GUARDIANS' ? 'warning' : 'error', text: error?.code === 'NO_GUARDIANS' ? tx(event === 'manual_test' ? 'v410.toast.noGuardiansTest' : 'v410.toast.noGuardians') : (error.message || 'Invio non riuscito.') });
      throw error;
    } finally {
      busyRef.current = false;
      setBusy(false);
      if (event !== 'manual_test') {
        setDispatchingAlert(false);
        setDispatchStage('idle');
      }
    }
  }, [pushActivity, tx]);

  // WALLAA_V4_0_65_RELIABLE_SENTINEL_HEARTBEAT
  // Heartbeat universale: il backend decide se questo account è una Sentinel attiva.
  // Non dipende dalla pagina Sentinel o da un GET preliminare: riduce i punti di guasto.
  useEffect(() => {
    if (!loaded || !networkIdentity?.authToken) return undefined;
    let stopped=false; let running=false;
    const ping=async()=>{
      if(stopped||running) return; running=true;
      try {
        let location=null;
        try { location=await getCurrentLocation(); if(!stopped&&location) setCurrentLocation(location); } catch {}
        if(!stopped) {
          const heartbeat = await sendUniversalSentinelHeartbeat(networkIdentityRef.current,location);
          if(!stopped) {
            const activeSentinel = heartbeat?.ignored !== true;
            const status = String(heartbeat?.status || 'offline').toLowerCase();
            await storage.setNativeSentinel({
              active: activeSentinel,
              available: activeSentinel && status !== 'offline',
              status,
              syncedAt: new Date().toISOString()
            });
          }
        }
      } catch(error) { console.warn('[WALLAA][SENTINEL] heartbeat',error?.message||error); }
      finally { running=false; }
    };
    ping();
    const timer=setInterval(ping,30000);
    const wake=()=>ping();
    const visible=()=>{if(document.visibilityState==='visible')ping();};
    document.addEventListener('visibilitychange',visible);
    window.addEventListener('focus',wake);
    window.addEventListener('online',wake);
    return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',wake);window.removeEventListener('online',wake);};
  }, [loaded, networkIdentity?.authToken]);

  // Legacy 45s Sentinel presence loop removed in v4.0.68.
  // The universal 30s heartbeat above is now the single source of Sentinel liveness.


  // WALLAA_ADMIN_LOCATION_REQUEST_HANDLER_V1
  // Best-effort: se la WebView e viva, aggiorna subito.
  // Se iOS sospende/termina l'app, la notifica visibile consente all'utente
  // di riaprire Wallaa e completare l'aggiornamento autorizzato.
  useEffect(() => {
    if (!loaded || !networkIdentity?.authToken) return undefined;

    let busy=false;

    const handleAdminLocationRequest = async () => {
      if (busy) return;
      if (profileRef.current?.sosLocationEnabled === false) return;

      busy=true;

      try {
        setLocationStatus('checking');

        const location=await getCurrentLocation();

        setCurrentLocation(location);
        setLocationStatus('ready');

        await sendAuthorizedLocationSnapshot(
          networkIdentityRef.current,
          location,
          telemetryRef.current?.battery??null
        );

        console.info(
          '[WALLAA][ADMIN_LOCATION_REQUEST] snapshot uploaded',
          location?.capturedAt || ''
        );
      } catch(error) {
        setLocationStatus('error');
        console.warn(
          '[WALLAA][ADMIN_LOCATION_REQUEST] unavailable',
          error?.message || error
        );
      } finally {
        busy=false;
      }
    };

    window.addEventListener(
      'wallaa:admin-location-request',
      handleAdminLocationRequest
    );

    return () => {
      window.removeEventListener(
        'wallaa:admin-location-request',
        handleAdminLocationRequest
      );
    };
  }, [
    loaded,
    networkIdentity?.authToken,
    profile?.liveProtectionEnabled,
    profile?.sosLocationEnabled
  ]);

// WALLAA_V4_0_62_AUTHORIZED_LOCATION_SNAPSHOT
  // Last-known foreground snapshot for the safety Admin. This does not enable background Live Protection.
  useEffect(() => {
    if (!loaded || !networkIdentity?.authToken || profile?.sosLocationEnabled === false) return undefined;
    let stopped=false;
    const publish=async()=>{
      if(stopped || document.visibilityState==='hidden') return;
      try {
        const location=await getCurrentLocation();
        if(stopped) return;
        setCurrentLocation(location);
        await sendAuthorizedLocationSnapshot(networkIdentityRef.current,location,telemetryRef.current?.battery??null);
      } catch { /* permission denied/unavailable: Admin will correctly show no authorized position */ }
    };
    publish();
    const timer=setInterval(publish,120000);
    const visible=()=>{if(document.visibilityState==='visible')publish();};
    document.addEventListener('visibilitychange',visible);
    return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  }, [loaded, networkIdentity?.authToken, profile?.sosLocationEnabled]);

  useEffect(()=>{
    if(!loaded||!networkIdentity?.authToken)return;
    let stopped=false,busy=false;
    const refresh=async()=>{if(busy||document.visibilityState==='hidden')return;busy=true;try{
      const result=await getActiveGuardianAlerts(networkIdentityRef.current);
      if(!stopped)setGuardianAlerts(result.alerts||[]);
    }catch{/* Keep the last known active SOS during a temporary outage. */}finally{busy=false;}};
    refresh();const timer=setInterval(refresh,5000);document.addEventListener('visibilitychange',refresh);
    return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
  },[loaded,networkIdentity?.authToken]);
  const acknowledgeIncomingAlert=useCallback(()=>{stopWallaaAlarm();clearDeliveredWallaaNotifications().catch(()=>{});setIncomingAlertMinimized(true);},[]);
  const openGuardianAlert=useCallback(async id=>{const result=await getNetworkAlert(networkIdentityRef.current,id);if(result?.alert){setIncomingAlert({...result.alert,remote:result.alert.status==='active',opened:true});setIncomingAlertMinimized(false);}},[]);
  const activeGuardianAlerts=[...guardianAlerts];
  if(incomingAlert?.status!=='closed'&&incomingAlert?.remote&& !activeGuardianAlerts.some(item=>item.id===incomingAlert.id))activeGuardianAlerts.unshift(incomingAlert);

  useEffect(()=>{
    if(!loaded||!networkIdentity?.authToken)return;
    let stopped=false;
    getWallaaNotificationHistory(networkIdentityRef.current).then(result=>{if(stopped)return;const rows=(result.notifications||[]).map(item=>({id:`remote-${item.id}`,at:item.createdAt,type:item.type==='sos'?'network-alert':'network-event',status:item.type==='sos'?'error':'success',title:item.title,detail:item.body,alertId:item.alertId,location:item.location}));setActivities(current=>{const ids=new Set(current.map(item=>item.id));const next=pruneActivities([...rows.filter(item=>!ids.has(item.id)),...current]);storage.setActivities(next).catch(()=>{});return next;});}).catch(()=>{});
    return()=>{stopped=true;};
  },[loaded,networkIdentity?.authToken]);

  // Keep a Guardian's incoming SOS position live while the app is open.
  // The initial push can arrive before the protected person's first GPS fix, so
  // this authenticated poll refreshes the same alert every 3 seconds.
  useEffect(() => {
    if (!loaded || !networkIdentity?.authToken || !incomingAlert?.remote || !incomingAlert?.id) return undefined;
    let stopped = false;
    const refreshIncomingAlert = async () => {
      try {
        const result = await getNetworkAlert(networkIdentityRef.current, incomingAlert.id);
        if (stopped || !result?.alert) return;
        const remote = result.alert;
        if(remote.status!=='active'){setGuardianAlerts(items=>items.filter(item=>item.id!==remote.id));setIncomingAlert(null);stopWallaaAlarm();return;}
        setIncomingAlert((current) => {
          if (!current || current.id !== incomingAlert.id) return current;
          return {
            ...current,
            ownerName: remote.ownerName || current.ownerName,
            at: remote.at || current.at,
            locationShared: remote.locationShared !== false,
            liveUrl: remote.liveUrl || current.liveUrl || '',
            location: remote.location?.latitude != null && remote.location?.longitude != null ? {
              ...remote.location,
              latitude: Number(remote.location.latitude),
              longitude: Number(remote.location.longitude),
              accuracy: remote.location.accuracy == null ? null : Number(remote.location.accuracy),
              mapsUrl: remote.location.mapsUrl || `https://www.google.com/maps?q=${encodeURIComponent(`${remote.location.latitude},${remote.location.longitude}`)}`
            } : current.location
          };
        });
      } catch (error) {
        // 404 after cleanup or a transient connection failure is retried on the next cycle.
      }
    };
    refreshIncomingAlert();
    const timer = setInterval(refreshIncomingAlert, 3000);
    const onVisible = () => { if (document.visibilityState === 'visible') refreshIncomingAlert(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [loaded, networkIdentity?.authToken, incomingAlert?.id, incomingAlert?.remote]);

  const resetLocalSession = useCallback(async () => {
    const currentIdentity = networkIdentityRef.current;
    await stopBleScan().catch(() => {});
    await stopPushListeners().catch(() => {});
    pushInitializedRef.current = false;
    if (profileSyncTimerRef.current) { clearTimeout(profileSyncTimerRef.current); profileSyncTimerRef.current = null; }
    await storage.clearAll();

    const emptyProfile = { customerId:'',name:'',firstName:'',lastName:'',email:'',phone:'',countryCode:'+39',birthCountry:'',birthPlace:'',safetyWord:'',language:currentLanguage(),plan:'basic',networkObserverEnabled:true,sosLocationEnabled:true,liveProtectionEnabled:false,privacyAccepted:false,termsAccepted:false,onboardingComplete:false };
    const identity = { installationId: currentIdentity?.installationId || makeId(), userId:'', authToken:'', qrToken:'', qrPayload:'' };
    await storage.setProfile(emptyProfile);
    await storage.setNetworkIdentity(identity);

    setProfile(emptyProfile); profileRef.current = emptyProfile;
    setNetworkIdentity(identity); networkIdentityRef.current = identity;
    setContacts([]); contactsRef.current = [];
    setDevice(null); deviceRef.current = null;
    setActivities([]);
    setActiveAlert(null); activeAlertRef.current = null;
    setResolvedAlert(null);
    setLastAlert(null);
    setIncomingAlert(null);setGuardianAlerts([]);setIncomingAlertMinimized(false);
    setTelemetry({ battery:null, rssi:null, seenAt:null });
    setPairingState('idle');
    setQrDataUrl('');
    setNetworkState({ status:'signed-out', guardians:[], following:[], pushPermission:'unknown' });
    setSystemHealth({ status:'idle' });
    setArmedState(true); armedRef.current = true;
    setTriggerState('double_press'); triggerRef.current = 'double_press';
    disconnectNotifiedRef.current = false;
    lastHeartbeatStatusRef.current = '';
  }, [currentLanguage]);

  const closeActiveAlert = useCallback(async () => {
    const alert = activeAlertRef.current;
    if (!alert?.id) return;
    try {
      await closeLiveAlert(networkIdentityRef.current, alert.id);
    } catch (error) {
      setToast({ type: 'error', text: error.message });
      throw error;
    }
    await pushActivity({ type: 'alert-closed', status: 'success', title: 'Allarme terminato' });
    const resolved = { ...alert, active:false, status:'closed', resolvedBy:'user', resolvedAt:new Date().toISOString() };
    setResolvedAlert(resolved);
    setActiveAlert(null);
    activeAlertRef.current = null;
    await storage.setActiveAlert(null);
    setToast({ type: 'success', text: 'Allarme terminato. La rete Wallaa è stata aggiornata.' });
  }, [pushActivity]);

  useEffect(() => {
    if (!loaded || !networkIdentity?.authToken) return undefined;
    let cancelled=false;
    let invalidating=false;
    const refreshAccount=async()=>{
      try {
        const result=await getWallaaAccount(networkIdentityRef.current);
        if(cancelled || !result?.profile) return;
        const merged={...profileRef.current,...result.profile,safetyWord:profileRef.current?.safetyWord||'',sosLocationEnabled:profileRef.current?.sosLocationEnabled!==false};
        setProfile(merged); profileRef.current=merged; await storage.setProfile(merged);
      } catch (error) {
        if (!cancelled && !invalidating && (error?.status === 401 || error?.status === 404 || error?.code === 'SESSION_INVALID')) {
          invalidating=true;
          await resetLocalSession();
          setToast({ type:'warning', text:'Il tuo account o la sessione non sono più disponibili. Accedi o registrati nuovamente.' });
        }
        // Other network failures are transient and retried.
      }
    };
    refreshAccount();
    const timer=setInterval(refreshAccount,15000);
    const onVisibility=()=>{ if(document.visibilityState === 'visible') refreshAccount(); };
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{cancelled=true;clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility);};
  }, [loaded, networkIdentity?.authToken, resetLocalSession]);

  // Keep the app synchronized with closures performed by the Operating Console.
  // Push notifications are the fast path; this authenticated poll is the reliable fallback.
  useEffect(() => {
    if (!loaded || !networkIdentity?.authToken || !activeAlert?.id) return undefined;
    let stopped = false;
    const checkStatus = async () => {
      try {
        const result = await getWallaaAlerts(networkIdentityRef.current);
        if (stopped) return;
        const remote = (result?.alerts || []).find((item) => item.id === activeAlertRef.current?.id);
        if (!remote || remote.status === 'active') return;
        const current = activeAlertRef.current;
        if (!current) return;
        const resolved = { ...current, active:false, status:remote.status || 'closed', resolvedBy:'operating-center', resolvedAt:remote.closedAt || new Date().toISOString() };
        setResolvedAlert(resolved);
        setActiveAlert(null); activeAlertRef.current = null;
        await storage.setActiveAlert(null);
        await pushActivity({ type:'alert-closed-remote', status:'success', title:'Allarme chiuso dalla Centrale Wallaa' });
      } catch { /* transient network failure: next check retries */ }
    };
    checkStatus();
    const timer = setInterval(checkStatus, 5000);
    const onVisible = () => { if (document.visibilityState === 'visible') checkStatus(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [loaded, networkIdentity?.authToken, activeAlert?.id, pushActivity]);

  useEffect(() => {
    if (!loaded || !networkIdentity?.authToken || profile?.plan !== 'pro' || !profile?.liveProtectionEnabled) return undefined;
    let stopped=false; let stopWatch=null; let lastSent=0;
    requestLocationPermission().catch(()=>{}).finally(()=>{
      if(stopped) return;
      watchLiveLocation({
        onLocation: async(location)=>{
          setCurrentLocation(location); setLocationStatus('ready');
          const now=Date.now(); if(now-lastSent<5000) return; lastSent=now;
          try { await sendLiveProtectionLocation(networkIdentityRef.current,location,telemetryRef.current?.battery??null); } catch { /* retry on next sample */ }
        },
        onError:()=>setLocationStatus('error')
      }).then(stop=>{if(stopped){stop?.();}else stopWatch=stop;}).catch(()=>setLocationStatus('error'));
    });
    return()=>{stopped=true;stopWatch?.();};
  }, [loaded, networkIdentity?.authToken, profile?.plan, profile?.liveProtectionEnabled]);

  useEffect(() => {
    if (!activeAlert?.id || !activeAlert.active || profileRef.current?.plan !== 'pro' || profile?.sosLocationEnabled === false) return undefined;
    let stopped = false;
    let stopWatch = null;
    let lastPublishedAt = 0;
    let publishing = false;

    const onLocation = async (location) => {
      if (stopped) return;
      setActiveAlert((current) => current ? { ...current, location } : current);
      const now = Date.now();
      if (publishing || now - lastPublishedAt < 2000) return;
      publishing = true;
      try {
        await updateLiveLocation(networkIdentityRef.current, activeAlert.id, location);
        lastPublishedAt = now;
        console.info('[WALLAA][LIVE] uploaded', activeAlert.id, location.latitude, location.longitude, location.capturedAt);
      } catch (error) {
        console.warn('[WALLAA][LIVE] upload failed', activeAlert.id, error?.message || error);
        // Keep the local live position and retry on the next location sample.
      } finally {
        publishing = false;
      }
    };

    watchLiveLocation({ onLocation, onError: () => {} })
      .then((stop) => { if (stopped) stop?.(); else stopWatch = stop; })
      .catch(() => {});

    return () => {
      stopped = true;
      stopWatch?.();
    };
  }, [activeAlert?.id, activeAlert?.active, profile?.plan, profile?.sosLocationEnabled]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [savedProfile, savedContacts, savedDevice, savedArmed, savedTrigger, savedActivities, savedIdentity, savedGuard, savedAppearance, savedActiveAlert] = await Promise.all([
        storage.getProfile(), storage.getContacts(), storage.getDevice(), storage.getArmed(), storage.getTrigger(), storage.getActivities(),
        storage.getNetworkIdentity(), storage.getConnectionGuard(), storage.getAppearance(), storage.getActiveAlert()
      ]);

      if (!active) return;
      const identity = savedIdentity || newNetworkIdentity();
      const legacyHasName = Boolean(savedProfile?.name?.trim());
      const normalizedProfile = {
        name: '', firstName: '', lastName: '', email: '', phone: '', countryCode: '+39', birthCountry: '', birthPlace: '', safetyWord: '', plan: 'basic', networkObserverEnabled:true, sosLocationEnabled: true, liveProtectionEnabled: false, privacyAccepted: false, termsAccepted: false,
        ...savedProfile,
        language: savedProfile?.language || defaultLanguage,
        onboardingComplete: savedProfile?.onboardingComplete ?? legacyHasName
      };
      if (!normalizedProfile.name) normalizedProfile.name = profileName(normalizedProfile);
      const normalizedContacts = (savedContacts || []).map(normalizeContact);

      // Validate a persisted authenticated session before restoring hardware state.
      // If an operator deleted the account, do not briefly re-arm an old paired button.
      let bootProfile = normalizedProfile;
      let sessionInvalid = false;
      if (identity.authToken && normalizedProfile.onboardingComplete) {
        try {
          const remote = await getWallaaAccount(identity);
          if (remote?.profile) {
            bootProfile = { ...normalizedProfile, ...remote.profile, safetyWord: normalizedProfile.safetyWord || '', sosLocationEnabled: normalizedProfile.sosLocationEnabled !== false };
            bootProfile.name = profileName(bootProfile);
          }
        } catch (error) {
          sessionInvalid = error?.status === 401 || error?.status === 404 || error?.code === 'SESSION_INVALID';
        }
      }

      if (sessionInvalid) {
        networkIdentityRef.current = identity;
        await resetLocalSession();
        setLoaded(true);
        setToast({ type:'warning', text:'Il tuo account non è più disponibile. Effettua una nuova registrazione o accedi con un altro account.' });
        return;
      }

      setProfile(bootProfile); profileRef.current = bootProfile;
      if (bootProfile !== normalizedProfile) await storage.setProfile(bootProfile);
      setContacts(normalizedContacts); contactsRef.current = normalizedContacts;
      const restoredDevice=savedDevice?{...savedDevice,name:'Wallaa Button',monitorMode:savedDevice.monitorMode||'event-only',...(/^LEGACY-/i.test(savedDevice.hardwareId||'')?{mokoSetupVerified:false}:{})}:null;
      setDevice(restoredDevice);deviceRef.current=restoredDevice;
      if(restoredDevice?.mokoSetupVerified===false)await storage.setDevice(restoredDevice);
      setArmedState(savedArmed);
      const restoredTrigger='press';
      setTriggerState(restoredTrigger);triggerRef.current=restoredTrigger;
      if(restoredTrigger!==savedTrigger)await storage.setTrigger(restoredTrigger);
      const retainedActivities = pruneActivities(savedActivities);
      setActivities(retainedActivities);
      if (retainedActivities.length !== (savedActivities || []).length) storage.setActivities(retainedActivities).catch(() => {});
      setNetworkIdentity(identity); networkIdentityRef.current = identity;
      if (identity.qrPayload) {
        try { setQrDataUrl(await createQrDataUrl(identity.qrPayload)); } catch { /* cached QR can be rebuilt after sync */ }
      }
      setConnectionGuardState(savedGuard || { enabled: true, delaySeconds: 60 });
      setAppearanceState({mode:'dark'});await storage.setAppearance({mode:'dark'});
      setActiveAlert(savedActiveAlert?.active ? savedActiveAlert : null);
      activeAlertRef.current = savedActiveAlert?.active ? savedActiveAlert : null;
      await storage.setNetworkIdentity(identity);
      setLoaded(true);
      requestLocationPermission().catch(() => {});
      if (identity.authToken && bootProfile.onboardingComplete) {
        await initializeAccountServices(identity, bootProfile);
      } else {
        setNetworkState((current) => ({ ...current, status: 'signed-out', pushPermission: 'unknown' }));
      }
    })();

    return () => {
      active = false;
      stopBleScan().catch(() => {});
      stopPushListeners().catch(() => {});
      pushInitializedRef.current = false;
    };
  }, [defaultLanguage, initializeAccountServices, resetLocalSession]);

  useEffect(() => {
    if(pairingActive)return undefined;
    if (!loaded || !networkIdentity?.authToken || !appVisible || ((!device?.id || !armed) && !profile?.networkObserverEnabled)) {
      stopBleScan().catch(() => {});
      return undefined;
    }

    startWallaaMonitor({
      deviceId: armed ? device?.id : null,
      hardwareId: device?.hardwareId,
      communityEnabled: profile?.networkObserverEnabled === true,
      onCommunityObservation: observation => {networkObservationBuffer.current.set(observation.hardwareId,observation);setReceiverLocal(value=>({...value,lastDetectedAt:observation.observedAt}));if(!networkLastSent.current.has(observation.hardwareId))networkPublish.current?.();},
      onTelemetry: (data) => {
        setTelemetry((prev) => ({ ...prev, battery:data.battery, rssi:data.rssi, rssiSampledAt:data.seenAt,rssiSource:'advertisement',seenAt:data.seenAt, ...(data.protocol === 'moko-button' ? { motion:data.motion, acceleration:data.acceleration, batteryVoltageMv:data.batteryVoltageMv } : {}) }));
        const current = deviceRef.current;
        const identity = networkIdentityRef.current;
        if(current && data.protocol==='moko-button' && (!current.hardwareId?.startsWith('MOKO:')||current.protocol!=='moko-button')){
          const recognized={...current,protocol:'moko-button',...(current.hardwareId?.startsWith('MOKO:')?{}:{mokoSetupVerified:false})};
          deviceRef.current=recognized;setDevice(recognized);storage.setDevice(recognized).catch(()=>{});
          triggerRef.current='press';setTriggerState('press');storage.setTrigger('press').catch(()=>{});
          return;
        }
        if (!deviceClaimMigrationRef.current && current?.id && !current?.claimToken && data?.portableIdentity && data?.hardwareId && identity?.authToken) {
          deviceClaimMigrationRef.current = true;
          claimWallaaDevice(identity, {
            ...current,
            hardwareId:data.hardwareId,
            advertisedName:data.advertisedName || '',
            identitySource:data.identitySource || 'advertised-serial',
            portableIdentity:true
          }).then(async (claim) => {
            const upgraded = {
              ...current,
              hardwareId:claim.hardwareId || data.hardwareId,
              advertisedName:data.advertisedName || current.advertisedName || '',
              identitySource:data.identitySource || current.identitySource || 'advertised-serial',
              portableIdentity:true,
              claimToken:claim.claimToken,
              permanentOwnership:true
            };
            setDevice(upgraded);
            deviceRef.current = upgraded;
            await storage.setDevice(upgraded);
            setToast({ type:'success', text:'Wallaa Button registrato. Questo dispositivo appartiene ora al tuo account.' });
          }).catch((error) => {
            if (error?.code === 'DEVICE_ALREADY_OWNED') {
              setToast({ type:'error', text:'Questo Wallaa Button è già registrato e non può essere associato a questo account.' });
            }
          }).finally(() => {
            deviceClaimMigrationRef.current = false;
          });
        }
      },
      onEvent: async (evt) => {
        const currentDevice = deviceRef.current;
        const pairedAtMs = currentDevice?.pairedAt ? new Date(currentDevice.pairedAt).getTime() : 0;
        const isPairingPacket = currentDevice?.pairingPacketId != null && evt.packetId != null && Number(currentDevice.pairingPacketId) === Number(evt.packetId);
        // The physical press used to pair the button is often advertised repeatedly for a few seconds.
        // It must never be interpreted as the user's first SOS.
        if (isPairingPacket && pairedAtMs && Date.now() - pairedAtMs < 15000) return;

        await pushActivity({ type: 'button', status: 'success', titleKey: 'activity.buttonPress', trigger: evt.event, battery: evt.battery });
        if (armedRef.current && triggerMatches(triggerRef.current, evt.event)) fireAlert(evt.event, { packetId: evt.packetId }).catch(() => {});
      },
      onError: (error) => setToast({ type: 'error', text: error.message || 'Errore Bluetooth.' })
    }).catch((error) => setToast({ type: 'error', text: error.message || 'Impossibile avviare il monitor Bluetooth.' }));

    return () => { stopBleScan().catch(() => {}); };
  }, [loaded, device?.id, device?.hardwareId, armed, appVisible, profile?.networkObserverEnabled, networkIdentity?.authToken, fireAlert, pushActivity, pairingState, pairingActive]);

  useEffect(() => {
    if (!loaded || !networkIdentity?.authToken || !device?.hardwareId?.startsWith('MOKO:') || !supportsMokoConnection()) return undefined;
    let stopped = false;
    configureMokoConnection({ hardwareId: device.hardwareId, enabled: device.mokoContinuousEnabled !== false,
      password: 'Moko4321', useExistingPassword: true }).catch(error => setToast({type:'error',text:error.message}));
    const refresh = async () => {
      try {
        const status = await getMokoConnectionStatus();
        if (stopped) return;
        if(status.ready&&status.connected){if(nativeReadySinceRef.current===null)nativeReadySinceRef.current=Date.now();}else nativeReadySinceRef.current=null;
        setMokoConnection(status);
        if (status.connected) setTelemetry(prev => mergeMokoTelemetry(prev,status));
      } catch (error) { if (!stopped) setMokoConnection({state:'unavailable',connected:false,ready:false}); }
    };
    refresh();
    const timer = setInterval(refresh, 1500);
    return () => { stopped = true; clearInterval(timer); };
  }, [loaded, networkIdentity?.authToken, device?.hardwareId, device?.mokoContinuousEnabled]);

  const refreshButtonStatus=useCallback(async()=>{
    const current=deviceRef.current;if(!current?.hardwareId?.startsWith('MOKO:'))return;
    const status=await getMokoConnectionStatus({refresh:true});setMokoConnection(status);
    if(!status.connected)await configureMokoConnection({hardwareId:current.hardwareId,enabled:true,useExistingPassword:true});
    setToast({type:'info',text:'Aggiornamento del collegamento e dei dati del WB-001.'});
  },[]);

  const setMokoConnectionOptions = useCallback(async ({enabled, password}) => {
    const current = deviceRef.current;
    if (!current?.hardwareId?.startsWith('MOKO:')) return;
    try { await configureMokoConnection({hardwareId:current.hardwareId, enabled, password}); }
    catch (error) { setToast({type:'error',text:error.message || 'Configurazione del pulsante non riuscita.'}); return false; }
    const next = {...current, mokoContinuousEnabled:enabled};
    setDevice(next); deviceRef.current=next; await storage.setDevice(next);
    setToast({type:'success',text:enabled?'Connessione continua attivata. Verifica lo stato del pulsante.':'Connessione continua disattivata.'});
    return true;
  }, []);

  useEffect(() => {
    if (!loaded || !networkIdentity?.authToken || !profile?.networkObserverEnabled || !appVisible) return undefined;
    let stopped=false, publishing=false;
    const publish=async()=>{
      if(stopped || publishing || !networkObservationBuffer.current.size) return;
      const due=[...networkObservationBuffer.current.values()].filter(item=>observationDue(item,networkLastSent.current.get(item.hardwareId)));if(!due.length)return;
      publishing=true;
      try{
        const location=getCachedLocation()||await getCurrentLocation();
        if(stopped)return;
        const items=[...networkObservationBuffer.current.values()].filter(item=>observationDue(item,networkLastSent.current.get(item.hardwareId))).slice(0,10);
        if(items.length){await reportNetworkObservations(networkIdentityRef.current,location,items);if(stopped)return;for(const item of items)networkLastSent.current.set(item.hardwareId,Date.now());setReceiverLocal(value=>({...value,lastReportAt:new Date().toISOString(),error:''}));}
        for(const item of items)if(networkObservationBuffer.current.get(item.hardwareId)===item)networkObservationBuffer.current.delete(item.hardwareId);
        for(const [key,item] of networkObservationBuffer.current)if(Date.now()-new Date(item.observedAt).getTime()>60000)networkObservationBuffer.current.delete(key);
      }catch(error){if(!stopped)setReceiverLocal(value=>({...value,lastFailureAt:new Date().toISOString(),error:error.message||'Rilevamento non inviato.'}));}finally{publishing=false;}
    };
    networkPublish.current=publish;const timer=setInterval(publish,15000);
    return()=>{stopped=true;networkPublish.current=null;clearInterval(timer);networkObservationBuffer.current.clear();networkLastSent.current.clear();};
  },[loaded,networkIdentity?.authToken,profile?.networkObserverEnabled,appVisible]);

  useEffect(()=>{
    if(!loaded||!appVisible||!networkIdentity?.authToken||!profile?.networkObserverEnabled||!supportsMokoConnection())return;
    let stopped=false;const refresh=async()=>{try{const result=await getMokoConnectionStatus();if(!stopped)setReceiverNative(result.network||{});}catch{}};
    refresh();const timer=setInterval(refresh,10000);return()=>{stopped=true;clearInterval(timer);};
  },[loaded,appVisible,networkIdentity?.authToken,profile?.networkObserverEnabled]);

  useEffect(()=>{
    if(!loaded || !networkIdentity?.authToken || !device?.hardwareId?.startsWith('MOKO:') || !appVisible)return undefined;
    let stopped=false;
    const refresh=async()=>{try{const value=await getDeviceNetworkLocation(networkIdentityRef.current,device.hardwareId);if(!stopped)setNetworkDevice(value);}catch{if(!stopped)setNetworkDevice({trackingEnabled:false,lastObservation:null,unavailable:true});}};
    refresh();const timer=setInterval(refresh,20000);
    return()=>{stopped=true;clearInterval(timer);};
  },[loaded,networkIdentity?.authToken,device?.hardwareId,appVisible]);

  useEffect(()=>{
    if(!loaded || !networkIdentity?.authToken || !appVisible)return undefined;
    let stopped=false;
    const refresh=async()=>{try{const value=await getOwnedNetworkDevices(networkIdentityRef.current);if(stopped)return;const owned=value.devices||[];setNetworkOwnedDevices(owned);const current=deviceRef.current;if(!pairingInProgressRef.current&&current?.mokoSetupVerified===true&&current?.hardwareId?.startsWith('MOKO:')&&!owned.some(item=>item.hardwareId===current.hardwareId)){deviceRef.current=null;setDevice(null);await storage.setDevice(null);await configureMokoConnection({hardwareId:current.hardwareId,enabled:false,useExistingPassword:true});setToast({type:'warning',text:'L’associazione del WB-001 è stata revocata. Per usarlo occorre una nuova associazione autorizzata.'});}}catch{if(!stopped)setNetworkOwnedDevices([]);}};
    refresh();const timer=setInterval(refresh,20000);return()=>{stopped=true;clearInterval(timer);};
  },[loaded,networkIdentity?.authToken,appVisible]);

  const setNetworkObserver=useCallback(async(enabled)=>{
    try{
      if(enabled)await requestLocationPermission();
      await setNetworkParticipation(networkIdentityRef.current,enabled);
      const next={...profileRef.current,networkObserverEnabled:enabled};setProfile(next);profileRef.current=next;await storage.setProfile(next);
      setToast({type:'success',text:enabled?'Partecipazione alla rete Wallaa attivata.':'Partecipazione alla rete Wallaa disattivata.'});
    }catch(error){setToast({type:'error',text:error.message});}
  },[]);
  const setDeviceNetworkTracking=useCallback(async(enabled)=>{
    try{await saveDeviceNetworkTracking(networkIdentityRef.current,deviceRef.current,enabled);setNetworkDevice(prev=>({...prev,trackingEnabled:enabled,...(!enabled?{lastObservation:null}:{})}));}
    catch(error){setToast({type:'error',text:error.message});}
  },[]);

  const lastSignalAgeSeconds = useMemo(() => telemetry.seenAt ? Math.max(0, Math.round((clock - new Date(telemetry.seenAt).getTime()) / 1000)) : null, [telemetry.seenAt, clock]);

  const eventOnlyButton = Boolean(device?.id && (device.monitorMode || 'event-only') === 'event-only');

  const connectionStatus = useMemo(() => {
    if(pairingActive||device?.mokoSetupVerified===false)return 'setup-required';
    if (!device?.id) return 'absent';
    if (device?.hardwareId?.startsWith('MOKO:') && device.mokoContinuousEnabled !== false && supportsMokoConnection() && ['press','any_press'].includes(trigger)) {
      if (mokoConnection.state==='disabled'&&!armed)return 'protection-off';
      if (mokoConnection.connected) return 'connected';
      if (mokoConnection.disconnectedAt) return 'disconnected';
      return 'searching';
    }
    if (eventOnlyButton) {
      // Shelly BLU Button Tough is normally silent and advertises when an event occurs.
      // Silence must never be interpreted as a disconnect.
      if (lastSignalAgeSeconds != null && lastSignalAgeSeconds <= 20) return 'connected';
      return 'standby';
    }
    if (lastSignalAgeSeconds == null) return 'searching';
    if (lastSignalAgeSeconds <= 25) return 'connected';
    if (lastSignalAgeSeconds <= 60) return 'weak';
    return 'disconnected';
  }, [device?.id, device?.hardwareId, device?.mokoContinuousEnabled, armed, trigger, mokoConnection, eventOnlyButton, lastSignalAgeSeconds, device?.mokoSetupVerified, pairingState, pairingActive]);

  const guardExceeded = useMemo(() => Boolean(
    !pairingInProgressRef.current && device?.mokoSetupVerified!==false && device?.id && connectionGuard.enabled && (
      mokoConnection.disconnectedAt && connectionStatus === 'disconnected'
        ? (clock - new Date(mokoConnection.disconnectedAt).getTime()) / 1000 >= connectionGuard.delaySeconds
        : !eventOnlyButton && lastSignalAgeSeconds != null && lastSignalAgeSeconds >= connectionGuard.delaySeconds
    )
  ), [eventOnlyButton, device?.id, connectionGuard.enabled, connectionGuard.delaySeconds, lastSignalAgeSeconds, mokoConnection.disconnectedAt, connectionStatus, clock]);

  // Persist only state transitions. Advertising reception itself remains passive and is not polled.
  useEffect(() => {
    if(pairingInProgressRef.current || device?.mokoSetupVerified===false)return;
    if (!loaded || !device?.id || !networkIdentityRef.current?.authToken) return;
    if (!['connected', 'weak', 'standby', 'disconnected'].includes(connectionStatus)) return;
    if (lastHeartbeatStatusRef.current === connectionStatus) return;
    lastHeartbeatStatusRef.current = connectionStatus;
    sendDeviceHeartbeat(networkIdentityRef.current, {
      deviceId: device.id,
      hardwareId: device.hardwareId || '',
      claimToken: device.claimToken || '',
      status: connectionStatus,
      battery: telemetryRef.current.battery,
      rssi: telemetryRef.current.rssi,
      lastSeenAt: telemetryRef.current.seenAt,
      notifyGuardians: false,
      ...(device.hardwareId?.startsWith('MOKO:')?{health:{model:'WB-001',firmware:device.firmwareVersion,profileVersion:device.mokoProfileVersion,verified:device.mokoSetupVerified===true,ready:mokoConnection.ready===true,voltage:telemetryRef.current.batteryVoltageMv}}:{})
    }).catch(() => {});
  }, [loaded, device?.id, connectionStatus]);

  useEffect(() => {
    if(pairingInProgressRef.current || device?.mokoSetupVerified===false)return;
    if (!loaded || !device?.id || !guardExceeded || disconnectNotifiedRef.current) return;
    disconnectNotifiedRef.current = true;
    const delay = connectionGuard.delaySeconds;
    const language = profileRef.current?.language || 'en';
    const delayLabel = translate(language, delay === 30 ? 'v4.device.delay30' : delay === 60 ? 'v4.device.delay60' : 'v4.device.delay300');
    const guardTitle=language==='en'?'Your Wallaa Button is no longer with you':'Wallaa Button non è più con te';
    const guardBody=language==='en'?'Check that you have it with you and that Bluetooth is on.':'Controlla di averlo con te e che il Bluetooth sia attivo.';
    setToast({ type: 'error', text: guardBody });
    feedbackWarning();
    if(!device.hardwareId?.startsWith('MOKO:'))showLocalSafetyNotification({ title: guardTitle, body: guardBody, sound:'wallaa-soft-chime.wav',extra: { type: 'connection-guard', deviceId: device.id } }).catch(() => {});
    pushActivity({ type: 'disconnect', status: 'error', title: guardTitle, detail: `Connection Guard: ${delay}s` }).catch(() => {});
    const recipients = contactsRef.current
      .filter((c) => c.email?.trim() && c.permissions?.disconnectAlerts !== false)
      .map((c) => ({ name: c.name, email: c.email, phone: c.phone }));
    sendDeviceHeartbeat(networkIdentityRef.current, {
      deviceId: device.id,
      hardwareId: device.hardwareId || '',
      claimToken: device.claimToken || '',
      status: 'disconnected',
      battery: telemetryRef.current.battery,
      rssi: telemetryRef.current.rssi,
      lastSeenAt: telemetryRef.current.seenAt,
      notifyGuardians: true,
      contacts: recipients
    }).catch(() => {});
  }, [loaded, device?.id, guardExceeded, connectionGuard.delaySeconds, pushActivity]);

  useEffect(() => {
    if (!['connected', 'standby'].includes(connectionStatus) || !disconnectNotifiedRef.current) return;
    if(device?.hardwareId?.startsWith('MOKO:') && (!mokoConnection.ready||nativeReadySinceRef.current===null||clock-nativeReadySinceRef.current<30000))return;
    disconnectNotifiedRef.current = false;
    const language = profileRef.current?.language || 'en';
    setToast({ type: 'success', text: translate(language, 'v4.guard.reconnectToast') });
    pushActivity({ type: 'reconnect', status: 'success', title: translate(language, 'v4.guard.reconnectActivity') }).catch(() => {});
  }, [connectionStatus, pushActivity, clock, device?.hardwareId, mokoConnection.ready]);

  const signalQuality = useMemo(() => {
    const rssi = telemetry.rssi;
    if (connectionStatus === 'standby') return 'Standby';
    if (connectionStatus === 'disconnected' || connectionStatus === 'absent') return 'No Signal';
    if (rssi == null) return connectionStatus === 'searching' ? 'Searching' : '—';
    if (rssi >= -60) return 'Excellent';
    if (rssi >= -72) return 'Good';
    if (rssi >= -82) return 'Weak';
    return 'Very Weak';
  }, [telemetry.rssi, connectionStatus]);

  const ready = useMemo(() => {
    const hasEmail = contacts.some((c) => c.email?.trim() && c.permissions?.sosAlerts !== false);
    const hasWallaaGuardian = (networkState.guardians?.length || 0) > 0;
    const continuous = device?.hardwareId?.startsWith('MOKO:') && device.mokoContinuousEnabled !== false && supportsMokoConnection() && ['press','any_press'].includes(trigger);
    return Boolean(armed && device?.mokoSetupVerified!==false && !pairingInProgressRef.current && device?.id && (hasEmail || hasWallaaGuardian) && (!continuous || mokoConnection.ready));
  }, [armed, device, contacts, networkState.guardians, trigger, mokoConnection.ready]);

  const safetyLevel = useMemo(() => {
    let score = 0;
    if (armed) score += 20;
    if (device?.id) score += 30;

    // Event-only buttons are expected to be silent between presses. A recent packet
    // confirms operation but prolonged silence does not reduce protection readiness.
    if (connectionStatus === 'connected') score += 10;
    else if (connectionStatus === 'standby') score += 10;
    else if (connectionStatus === 'weak') score += 5;

    if (telemetry.battery == null) score += 5;
    else if (telemetry.battery >= 25) score += 10;
    else if (telemetry.battery >= 10) score += 5;

    if (contacts.some((c) => c.email?.trim() && c.permissions?.sosAlerts !== false) || networkState.guardians?.length) score += 15;
    if (networkState.status === 'ready') score += 10;
    if (networkState.pushPermission === 'granted') score += 5;

    if (connectionStatus === 'disconnected') score = Math.min(score, 55);
    if (connectionStatus === 'absent') score = Math.min(score, 25);
    return Math.max(0, Math.min(100, score));
  }, [armed, device?.id, connectionStatus, telemetry.battery, contacts, networkState.guardians, networkState.status, networkState.pushPermission]);

  const setArmed = useCallback(async (value) => { setArmedState(value); await storage.setArmed(value); }, []);
  const setTrigger = useCallback(async (value) => {value='press';setTriggerState(value);triggerRef.current=value;await storage.setTrigger(value);}, []);

  const saveProfile = useCallback(async (next) => {
    const normalized = { ...next, name: profileName(next) || next.name || '' };
    if(healthCheck.data.settings?.enabled){try{await healthCheck.updateContext(normalized);}catch(error){setToast({type:'error',text:error.message});return;}}
    setProfile(normalized); profileRef.current = normalized;
    await storage.setProfile(normalized);
    if (profileSyncTimerRef.current) clearTimeout(profileSyncTimerRef.current);
    profileSyncTimerRef.current = setTimeout(() => {
      syncNetworkIdentity({ nextProfile: profileRef.current }).catch(() => {});
    }, 650);
  }, [syncNetworkIdentity,healthCheck.data.settings?.enabled,healthCheck.updateContext]);

  const setGuardianMode = useCallback(async (enabled) => {
    if (profileRef.current?.plan !== 'pro' && enabled) throw new Error('Guardian Mode è disponibile con Wallaa Pro.');
    const next = { ...profileRef.current, liveProtectionEnabled: Boolean(enabled) };
    setProfile(next); profileRef.current = next; await storage.setProfile(next);
    await syncNetworkIdentity({ nextProfile: next });
    if (enabled) {
      await requestLocationPermission();
      setToast({ type:'success', text:'Guardian Mode attivata. La tua posizione viene condivisa in tempo reale con i soggetti autorizzati.' });
    } else {
      setToast({ type:'success', text:'Guardian Mode terminata.' });
    }
    return next;
  }, [syncNetworkIdentity]);

  const dismissResolvedAlert = useCallback(() => setResolvedAlert(null), []);

  const completeOnboarding = useCallback(async ({ password, confirmPassword: _confirmPassword, ...next }) => {
    if (
      !next.firstName?.trim() ||
      !next.lastName?.trim() ||
      !next.email?.trim() ||
      !next.phone?.trim() ||
      !next.dateOfBirth?.trim() ||
      !next.birthCountry?.trim() ||
      !next.birthPlace?.trim()
    ) throw new Error(tx('v405.auth.completeFields'));
    if (!next.privacyAccepted || !next.termsAccepted || !next.safetyNoticeAccepted) throw new Error(tx('v405.auth.acceptLegal'));
    if (!password || password.length < 8) throw new Error(tx('v405.auth.passwordLength'));
    const baseIdentity = networkIdentityRef.current || newNetworkIdentity();
    const draftProfile = { ...profileRef.current, ...next, privacyPolicyVersion: next.privacyPolicyVersion||CONFIG.privacyPolicyVersion, termsVersion: next.termsVersion||CONFIG.termsVersion, safetyNoticeVersion: next.safetyNoticeVersion||CONFIG.safetyNoticeVersion, name: `${next.firstName} ${next.lastName}`.trim(), plan: 'basic', networkObserverEnabled:true, sosLocationEnabled: true, liveProtectionEnabled: false, onboardingComplete: true };
    const registered = await registerWallaaAccount({ installationId: baseIdentity.installationId, profile: draftProfile, password, platform: Capacitor.getPlatform() });
    if (registered?.pendingVerification) return registered;
    const identity = { ...baseIdentity, userId: registered.userId, authToken: registered.authToken, qrToken: registered.qrToken || '', qrPayload: registered.qrPayload || '' };
    const normalized = { ...draftProfile, ...(registered.profile || {}), safetyWord: draftProfile.safetyWord || '', name: profileName(registered.profile || draftProfile), onboardingComplete: true };
    setProfile(normalized); profileRef.current = normalized; await storage.setProfile(normalized);
    setNetworkIdentity(identity); networkIdentityRef.current = identity; await storage.setNetworkIdentity(identity);
    if (identity.qrPayload) setQrDataUrl(await createQrDataUrl(identity.qrPayload));
    await initializeAccountServices(identity, normalized);
    return normalized;
  }, [initializeAccountServices, tx]);

  const loginAccount = useCallback(async ({ identifier, password }) => {
    if (!identifier?.trim() || !password) throw new Error(tx('v415.auth.identifierPassword'));
    const baseIdentity = networkIdentityRef.current || newNetworkIdentity();
    const logged = await loginWallaaAccount({ installationId: baseIdentity.installationId, identifier: identifier.trim(), password, platform: Capacitor.getPlatform() });
    const identity = { ...baseIdentity, userId: logged.userId, authToken: logged.authToken, qrToken: logged.qrToken || '', qrPayload: logged.qrPayload || '' };
    const normalized = { customerId:'', name:'', firstName:'', lastName:'', email:'', phone:'', countryCode:'+39', safetyWord:'', language:defaultLanguage, plan:'basic', sosLocationEnabled:true, ...(logged.profile || {}), onboardingComplete:true };
    normalized.name = profileName(normalized);
    await stopBleScan().catch(() => {});
    setContacts([]); contactsRef.current=[]; await storage.setContacts([]);
    setDevice(null); deviceRef.current=null; await storage.setDevice(null);
    setActivities([]); await storage.setActivities([]);
    setActiveAlert(null); activeAlertRef.current=null; setResolvedAlert(null); await storage.setActiveAlert(null);
    setTelemetry({ battery:null,rssi:null,seenAt:null });
    setProfile(normalized); profileRef.current=normalized; await storage.setProfile(normalized);
    setNetworkIdentity(identity); networkIdentityRef.current=identity; await storage.setNetworkIdentity(identity);
    if (identity.qrPayload) setQrDataUrl(await createQrDataUrl(identity.qrPayload));
    await initializeAccountServices(identity, normalized);
    return normalized;
  }, [defaultLanguage, initializeAccountServices, tx]);

  const refreshLegalStatus = useCallback(async (identity = networkIdentityRef.current) => {
    if (!identity?.authToken) {
      setLegalStatus(null);
      setLegalChecked(false);
      setLegalError('');
      return null;
    }

    try {
      const status = await getWallaaLegalStatus(identity);
      setLegalStatus(status);
      setLegalError('');
      return status;
    } catch (error) {
      setLegalError(error?.message || 'Verifica documenti legali non riuscita.');
      throw error;
    } finally {
      setLegalChecked(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded || !networkIdentity?.authToken || !profile?.onboardingComplete) {
      setLegalStatus(null);
      setLegalChecked(false);
      setLegalError('');
      return;
    }

    setLegalChecked(false);

    refreshLegalStatus(networkIdentity).catch(() => {
      // In caso di rete non disponibile usiamo le versioni già presenti
      // nel profilo locale come fallback. Un account con versioni vecchie
      // resta comunque soggetto al gate.
    });
  }, [
    loaded,
    networkIdentity?.authToken,
    profile?.onboardingComplete,
    refreshLegalStatus
  ]);

  const acceptLegalUpdate = useCallback(async ({
    privacyAccepted,
    termsAccepted,
    safetyNoticeAccepted,versions
  }) => {
    const identity = networkIdentityRef.current;

    if (!identity?.authToken) {
      throw new Error('Sessione Wallaa non valida.');
    }

    if (!privacyAccepted || !termsAccepted || !safetyNoticeAccepted) {
      throw new Error('Devi confermare tutti i documenti.');
    }

    const result = await acceptWallaaLegalDocuments(identity, {
      privacyAccepted,
      termsAccepted,
      safetyNoticeAccepted,
      language: currentLanguage(),versions
    });

    const accepted = result?.accepted || {};

    const nextProfile = {
      ...profileRef.current,
      privacyAccepted: true,
      termsAccepted: true,
      safetyNoticeAccepted: true,
      privacyPolicyVersion:
        accepted.privacyPolicyVersion || CONFIG.privacyPolicyVersion,
      termsVersion:
        accepted.termsVersion || CONFIG.termsVersion,
      safetyNoticeVersion:
        accepted.safetyNoticeVersion || CONFIG.safetyNoticeVersion
    };

    setProfile(nextProfile);
    profileRef.current = nextProfile;
    await storage.setProfile(nextProfile);

    await refreshLegalStatus(identity).catch(() => {
      setLegalStatus({
        ok: true,
        current: {
          privacyPolicyVersion: nextProfile.privacyPolicyVersion,
          termsVersion: nextProfile.termsVersion,
          safetyNoticeVersion: nextProfile.safetyNoticeVersion
        },
        accepted: {
          privacyPolicyVersion: nextProfile.privacyPolicyVersion,
          termsVersion: nextProfile.termsVersion,
          safetyNoticeVersion: nextProfile.safetyNoticeVersion
        }
      });
      setLegalChecked(true);
      setLegalError('');
    });

    return result;
  }, [currentLanguage, refreshLegalStatus]);

  const signOut = useCallback(async () => {
    const currentIdentity = networkIdentityRef.current;
    if(healthCheck.data.settings?.enabled)await healthCheck.save({enabled:false});
    try { await logoutWallaaAccount(currentIdentity); } catch { /* local sign-out still proceeds */ }
    await resetLocalSession();
  }, [resetLocalSession,healthCheck.data.settings?.enabled,healthCheck.save]);

  const addOrUpdateContact = useCallback(async (input) => {
    if (!networkIdentityRef.current?.authToken) throw new Error('Accedi a Wallaa per aggiornare la Rete di Sicurezza.');
    // Persist and resolve on the server first. Failed saves must never look successful locally.
    const result=await saveWallaaContact(networkIdentityRef.current,{...input,countryCode:profileRef.current?.countryCode||'+39'});
    const next=(result.contacts||[]).map(normalizeContact);
    setContacts(next);contactsRef.current=next;await storage.setContacts(next);
    await refreshNetwork().catch(()=>{});
    return result;

  }, [refreshNetwork]);

  const removeContact = useCallback(async (id) => {
    await deleteWallaaContact(networkIdentityRef.current,id);
    const next = contactsRef.current.filter(c=>c.id!==id);
    setContacts(next);contactsRef.current=next;await storage.setContacts(next);
    await refreshNetwork().catch(()=>{});

  }, [refreshNetwork]);

  const cancelPairing=useCallback(()=>{pairingControllerRef.current?.abort(new Error('Associazione annullata.'));pairingChoiceRef.current?.reject(new Error('Associazione annullata.'));},[]);
  const selectPairingCandidate=useCallback(candidate=>{const choice=pairingChoiceRef.current;if(!choice){setPairingError('La selezione è terminata. Ripeti il collegamento.');setPairingCandidates([]);return;}setPairingCandidates([]);setPairingState('connecting');choice.resolve(candidate);},[]);
  const pairDevice = useCallback(async ({password=MOKO_FACTORY_PASSWORD,existingDevice=null,upgrade=false}={}) => {
    if(pairingInProgressRef.current)return;
    if(activeAlertRef.current?.active){const error=new Error('Prima di configurare il pulsante, termina l’allarme attivo.');setToast({type:'warning',text:error.message});throw error;}
    const previousDevice=deviceRef.current,previousTrigger=triggerRef.current;
    const controller=new AbortController();pairingControllerRef.current=controller;pairingInProgressRef.current=true;setPairingActive(true);
    setPairingError('');setPairingCandidates([]);setPairingState('scanning');let target=null,lastCounter=null,claimed=null,completed=false;
    const nativeSnapshot=async next=>{
      const previous=await storage.getBackgroundConfig();
      await storage.setBackgroundConfig({...previous,version:2,armed:armedRef.current && next.mokoSetupVerified!==false,trigger:next.hardwareId?.startsWith('MOKO:')?'press':triggerRef.current,apiUrl:CONFIG.apiUrl,deviceId:next.id,hardwareId:next.hardwareId,claimToken:next.claimToken,profile:profileRef.current,contacts:contactsRef.current,identity:networkIdentityRef.current});
    };
    try {
      await beginMokoSetup();await stopBleScan();
      target=(existingDevice?.hardwareId?.startsWith('MOKO:')?existingDevice:null)||await pairWallaaButton({signal:controller.signal,onProgress:state=>setPairingState(state),selectMokoDevice:async(candidates,signal)=>{
        setPairingState('checking');
        const available=[];
        for(const candidate of candidates){if(signal.aborted)throw signal.reason;const eligibility=await checkWallaaDeviceClaim(networkIdentityRef.current,candidate).catch(error=>{if(error.code==='DEVICE_ALREADY_OWNED')return {allowed:false};throw error;});if(eligibility.allowed)available.push(candidate);}
        if(!available.length)throw new Error('I pulsanti rilevati appartengono già a un altro account. Accendi il tuo nuovo pulsante e riprova.');
        if(available.length===1)return available[0];
        candidates=available;
        return new Promise((resolve,reject)=>{
        setPairingState('selecting');setPairingCandidates(candidates);
        const timer=setTimeout(()=>pairingChoiceRef.current?.reject(new Error('Selezione interrotta. Ripeti il collegamento.')),120000);
        const abort=()=>pairingChoiceRef.current?.reject(new Error('Associazione annullata.'));
        signal.addEventListener('abort',abort,{once:true});
        pairingChoiceRef.current={resolve:value=>{clearTimeout(timer);signal.removeEventListener('abort',abort);pairingChoiceRef.current=null;resolve(value);},reject:error=>{clearTimeout(timer);signal.removeEventListener('abort',abort);pairingChoiceRef.current=null;reject(error);}};
      });}});
      if(controller.signal.aborted)throw controller.signal.reason;
      if(target.protocol==='moko-button'||target.hardwareId?.startsWith('MOKO:')){
        if(!supportsMokoConnection())throw new Error('La configurazione WB-001 richiede l’app Wallaa per iPhone.');
        await beginMokoSetup(); // Renew suppression after a potentially long device selection.
        const prepared=await prepareMokoButton({device:target,ble:BleClient,password,allowVerifiedUpgrade:upgrade,signal:controller.signal,onProgress:setPairingState,onCounter:count=>{lastCounter=count;},checkOwnership:device=>checkWallaaDeviceClaim(networkIdentityRef.current,device),claim:(device,eligibility)=>existingDevice?.claimToken&&eligibility.claimTokenValid?Promise.resolve({hardwareId:device.hardwareId,claimToken:existingDevice.claimToken}):claimWallaaDevice(networkIdentityRef.current,device),onClaim:async next=>{
          claimed=next;setDevice(next);deviceRef.current=next;await storage.setDevice(next);await nativeSnapshot(next);
        }});
        setPairingState('checking_signal');await captureMokoSetupBaseline(prepared);
        if(controller.signal.aborted)throw controller.signal.reason;
        const next={...prepared,mokoSetupVerified:true,mokoContinuousEnabled:true};
        setTriggerState('press');triggerRef.current='press';await storage.setTrigger('press');
        setDevice(next);deviceRef.current=next;await storage.setDevice(next);await nativeSnapshot(next);
        await configureMokoConnection({hardwareId:next.hardwareId,enabled:true,password,useExistingPassword:false});
        setPairingState('restoring');
        await endMokoSetup({hardwareId:next.hardwareId,baselineCount:lastCounter,keepSuppressed:true});
        if(armedRef.current){
          const limit=Date.now()+18000;let ready=false;
          while(Date.now()<limit){if(controller.signal.aborted)throw controller.signal.reason;const status=await getMokoConnectionStatus();setMokoConnection(status);if(status.ready){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,400));}
          if(!ready)throw new Error('Il collegamento non è stato confermato. Ripeti la configurazione con il pulsante vicino.');
        }
        await endMokoSetup();completed=true;
      }else{
        const claim=await claimWallaaDevice(networkIdentityRef.current,target);
        const next={...target,hardwareId:claim.hardwareId||target.hardwareId,claimToken:claim.claimToken,permanentOwnership:true,name:'Wallaa Button',monitorMode:'event-only'};
        setDevice(next);deviceRef.current=next;await storage.setDevice(next);completed=true;
      }
      setPendingMokoDevice(null);await storage.setPendingMokoDevice(null);
      await pushActivity({type:'device',status:'success',titleKey:'activity.devicePaired'});
      setPairingState('done');setToast({type:'success',text:'Pulsante associato e verificato.'});return deviceRef.current;
    }catch(error){
      setPairingError(error.message||'Collegamento non riuscito. Ripeti la procedura.');
      if(claimed){
        const incomplete={...claimed,mokoSetupVerified:false};
        if(previousDevice && previousDevice.hardwareId!==incomplete.hardwareId){
          setPendingMokoDevice(incomplete);await storage.setPendingMokoDevice({userId:networkIdentityRef.current?.userId,device:incomplete}).catch(()=>{});
          setDevice(previousDevice);deviceRef.current=previousDevice;setTriggerState(previousTrigger);triggerRef.current=previousTrigger;
          await storage.setDevice(previousDevice).catch(()=>{});await storage.setTrigger(previousTrigger).catch(()=>{});await nativeSnapshot(previousDevice).catch(()=>{});
        }else{setDevice(incomplete);deviceRef.current=incomplete;await storage.setDevice(incomplete).catch(()=>{});await nativeSnapshot(incomplete).catch(()=>{});}
      }
      setPairingState(error.code==='MOKO_PASSWORD_REQUIRED'?'password_error':claimed?'incomplete':'idle');
      setToast({type:'error',text:error.code==='DEVICE_ALREADY_OWNED'?'Questo pulsante è già associato a un altro account.':error.message||'Collegamento non riuscito.'});throw error;
    }finally{
      await stopBleScan().catch(()=>{});
      if(!completed&&target?.hardwareId?.startsWith('MOKO:')&&lastCounter!==null)await captureMokoSetupBaseline(target).catch(()=>{});
      await endMokoSetup(!completed&&target?{hardwareId:target.hardwareId,baselineCount:lastCounter}:{}).catch(()=>{});
      pairingInProgressRef.current=false;setPairingActive(false);pairingControllerRef.current=null;pairingChoiceRef.current=null;setPairingCandidates([]);
    }
  },[pushActivity]);
  const setupMokoDevice=useCallback(options=>pairDevice({...options,existingDevice:deviceRef.current}),[pairDevice]);
  const resumeMokoSetup=useCallback(options=>pairDevice({...options,existingDevice:pendingMokoDevice}),[pairDevice,pendingMokoDevice]);
  useEffect(()=>{if(!loaded)return;let active=true;storage.getPendingMokoDevice().then(saved=>{if(active&&saved?.userId===networkIdentity?.userId)setPendingMokoDevice(saved.device);});return()=>{active=false;};},[loaded,networkIdentity?.userId]);

  useEffect(()=>{
    const current=deviceRef.current;
    if(!loaded||!appVisible||pairingActive||activeAlert?.active||!current?.hardwareId?.startsWith('MOKO:')||current.mokoSetupVerified!==true||(current.mokoProfileVersion||0)>=MOKO_PROFILE_VERSION)return;
    const key=`${networkIdentity?.userId}:${current.hardwareId}:${MOKO_PROFILE_VERSION}`;
    if(profileUpgradeAttemptRef.current===key)return;
    profileUpgradeAttemptRef.current=key;
    checkWallaaDeviceClaim(networkIdentityRef.current,current).then(eligibility=>{
      if(eligibility.claimTokenValid!==true){setToast({type:'warning',text:'Apri Il mio pulsante per verificare il collegamento del WB-001.'});return;}
      return pairDevice({existingDevice:current,upgrade:true});
    }).catch(error=>setToast({type:'error',text:error.message||'Apri Il mio pulsante per completare l’aggiornamento.'}));
  },[loaded,appVisible,pairingActive,activeAlert?.active,device?.hardwareId,device?.mokoSetupVerified,device?.mokoProfileVersion,networkIdentity?.userId,pairDevice]);

  useEffect(()=>{
    if(!loaded||!networkIdentity?.authToken||!profile?.onboardingComplete)return;
    let active=true;
    storage.getSafetyGuideSeen().then(async seen=>{const status=await getSafetyPermissions();if(active){setSafetyPermissions(status);if(!seen)setShowSafetyGuide(true);}}).catch(()=>{});
    return()=>{active=false;};
  },[loaded,networkIdentity?.authToken,profile?.onboardingComplete]);
  const refreshSafetyPermissions=useCallback(async()=>{const status=await getSafetyPermissions();setSafetyPermissions(status);return status;},[]);
  const activateSafetyPermissions=useCallback(async()=>{await requestLocationPermission();await ensureLocalNotificationPermission();await requestSafetyLocation();await refreshSafetyPermissions();await initializeAccountServices();},[refreshSafetyPermissions,initializeAccountServices]);
  useEffect(()=>{if(!showSafetyGuide)return;const timer=setInterval(()=>refreshSafetyPermissions().catch(()=>{}),2000);return()=>clearInterval(timer);},[showSafetyGuide,refreshSafetyPermissions]);
  const finishSafetyGuide=useCallback(async()=>{setShowSafetyGuide(false);await storage.setSafetyGuideSeen(true);},[]);
  useEffect(()=>{
    if(!loaded||!appVisible||!device?.hardwareId?.startsWith('MOKO:')||!networkIdentity?.authToken)return;
    const send=()=>{if(pairingInProgressRef.current)return;const payload=buildButtonHeartbeat(deviceRef.current,telemetryRef.current,mokoConnection);if(payload)sendDeviceHeartbeat(networkIdentityRef.current,payload).catch(()=>{});};
    const initial=setTimeout(send,5000);
    const timer=setInterval(send,60000);return()=>{clearTimeout(initial);clearInterval(timer);};
  },[loaded,appVisible,device?.hardwareId,networkIdentity?.authToken,mokoConnection.connected,mokoConnection.ready]);

  const disconnectDevice = useCallback(async () => {
    await stopBleScan(); setDevice(null); deviceRef.current = null; disconnectNotifiedRef.current = false; lastHeartbeatStatusRef.current = '';
    setTelemetry({ battery: null, rssi: null, seenAt: null }); await storage.setDevice(null);
    await pushActivity({ type: 'device', status: 'success', titleKey: 'activity.deviceDisconnected' });
  }, [pushActivity]);

  const setConnectionGuard = useCallback(async (next) => {
    if (next.enabled && !connectionGuardRef.current.enabled) await ensureLocalNotificationPermission();
    setConnectionGuardState(next); connectionGuardRef.current = next; await storage.setConnectionGuard(next);
  }, []);

  const setAppearance = useCallback(async (mode) => {
    const next = { mode:'dark' };
    setAppearanceState(next); await storage.setAppearance(next);
  }, []);

  const scanNetworkQr = useCallback(async () => {
    const identity = networkIdentityRef.current;
    if (!identity?.authToken) throw new Error(tx('error.networkNotReady'));
    const code = await scanQrWithCamera();
    const result = await scanWallaaCode(identity, code);
    setToast({ type: 'success', text: tx('toast.qrConnectedBilateral', { name: result.protectedUser.displayName }) });
    await refreshNetwork(identity);
    return result;
  }, [refreshNetwork, tx]);


  // Keep both sides of Wallaa Network in sync. A QR connection is mutual from v4.0.46,
  // so the person whose QR was scanned should see the new relationship without having
  // to close/reopen the app or press Refresh.
  useEffect(() => {
    if (!loaded || !appVisible || !networkIdentity?.authToken) return undefined;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refreshNetwork(networkIdentityRef.current);
    };
    const timer = setInterval(tick, 8000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [loaded, appVisible, networkIdentity?.authToken, refreshNetwork]);

  const rotateQr = useCallback(async () => {
    const identity = networkIdentityRef.current;
    const result = await rotateWallaaQr(identity);
    const next = { ...identity, qrToken: result.qrToken, qrPayload: result.qrPayload };
    setNetworkIdentity(next); networkIdentityRef.current = next; await storage.setNetworkIdentity(next);
    setQrDataUrl(await createQrDataUrl(result.qrPayload));
    setToast({ type: 'success', text: tx('toast.newQr') });
  }, [tx]);

  const removeNetworkLink = useCallback(async (linkId) => {
    await removeWallaaLink(networkIdentityRef.current, linkId);
    await refreshNetwork(networkIdentityRef.current);
  }, [refreshNetwork]);

  const clearActivities = useCallback(async () => {
    // WALLAA_V4_0_59_CLEAR_REMOTE_NOTIFICATIONS
    const identity=networkIdentityRef.current;
    const result=identity?.authToken?await clearWallaaNotificationHistory(identity):{};
    if(identity?.authToken!==networkIdentityRef.current?.authToken)return;
    await healthCheck.clearNotificationFeed(result.healthNotificationsClearedAt);
    setActivities([]);
    await storage.setActivities([]);
  }, [healthCheck.clearNotificationFeed]);

  const clearData = useCallback(async () => {
    await stopBleScan().catch(() => {});
    setContacts([]); contactsRef.current=[]; await storage.setContacts([]);
    setDevice(null); deviceRef.current=null; await storage.setDevice(null);
    setActivities([]); await storage.setActivities([]);
    setTelemetry({ battery:null,rssi:null,seenAt:null });
    setLastAlert(null); setActiveAlert(null); activeAlertRef.current=null; await storage.setActiveAlert(null);
    setConnectionGuardState({enabled:true,delaySeconds:60}); await storage.setConnectionGuard({enabled:true,delaySeconds:60});
    disconnectNotifiedRef.current=false; lastHeartbeatStatusRef.current='';
    setToast({ type:'success', text:tx('toast.resetDone') });
  }, [tx]);

  const deleteAccount = useCallback(async () => {
    try { await deleteWallaaAccount(networkIdentityRef.current); } catch (error) { if (networkIdentityRef.current?.authToken) throw error; }
    await resetLocalSession();
  }, [resetLocalSession]);


  const legalRequired = useMemo(() => {
    if (!networkIdentity?.authToken || !profile?.onboardingComplete) {
      return false;
    }

    const current = legalStatus?.current;
    const accepted = legalStatus?.accepted;

    if (current && accepted) {
      return (
        !accepted.privacyPolicyVersion ||
        !accepted.termsVersion ||
        !accepted.safetyNoticeVersion ||
        accepted.privacyPolicyVersion !== current.privacyPolicyVersion ||
        accepted.termsVersion !== current.termsVersion ||
        accepted.safetyNoticeVersion !== current.safetyNoticeVersion
      );
    }

    return (
      profile?.privacyPolicyVersion !== CONFIG.privacyPolicyVersion ||
      profile?.termsVersion !== CONFIG.termsVersion ||
      profile?.safetyNoticeVersion !== CONFIG.safetyNoticeVersion
    );
  }, [
    networkIdentity?.authToken,
    profile?.onboardingComplete,
    profile?.privacyPolicyVersion,
    profile?.termsVersion,
    profile?.safetyNoticeVersion,
    legalStatus
  ]);

  const legalGatePending = Boolean(
    networkIdentity?.authToken &&
    profile?.onboardingComplete &&
    !legalChecked
  );

  const restoreHealthSOS=alert=>{if(!alert?.id)return;setActiveAlert(alert);activeAlertRef.current=alert;setLastAlert(alert);storage.setActiveAlert(alert).catch(()=>{});};
  const setProtectionEnabled=async value=>{try{if(!value&&healthCheck.data.settings?.enabled)await healthCheck.save({enabled:false});setArmed(value);}catch(error){setToast({type:'error',text:error.message});}};
  return {
    restoreHealthSOS,loaded, profile, contacts, device, armed, trigger, activities, telemetry, pairingState, pairingError, busy, dispatchingAlert, dispatchStage, ready, toast, lastAlert,
    networkIdentity, networkState, qrDataUrl, incomingAlert, incomingAlertMinimized, activeGuardianAlerts, acknowledgeIncomingAlert, openGuardianAlert, sentinelOffer, connectionGuard, appearance, connectionStatus, lastSignalAgeSeconds,
    messagePush,
    centralMessagePush,
    healthCheck,showSafetyGuide,safetyPermissions,activateSafetyPermissions,refreshSafetyPermissions,finishSafetyGuide,openSafetySettings,refreshButtonStatus,pendingMokoDevice,resumeMokoSetup,pairingCandidates,selectPairingCandidate,cancelPairing,setupMokoDevice,networkOwnedDevices, networkDevice, networkReceiverStatus, setNetworkObserver, setDeviceNetworkTracking, mokoConnection, setMokoConnectionOptions, signalQuality, safetyLevel, activeAlert, resolvedAlert, systemHealth, currentLocation, locationStatus, authenticated: Boolean(networkIdentity?.authToken && profile?.onboardingComplete),
    legalStatus, legalChecked, legalRequired, legalGatePending, legalError,
    setToast, setArmed:setProtectionEnabled, setTrigger, saveProfile, setGuardianMode, dismissResolvedAlert, completeOnboarding, loginAccount, signOut, acceptLegalUpdate, refreshLegalStatus, addOrUpdateContact, removeContact, pairDevice, disconnectDevice,
    fireAlert, closeActiveAlert, clearActivities, clearData, deleteAccount, refreshNetwork, scanNetworkQr, rotateQr, removeNetworkLink,
    setIncomingAlert, clearSentinelOffer, setConnectionGuard, setAppearance, refreshSystemHealth, sendTestEmail, testAlarmSound, refreshCurrentLocation
  };
}
