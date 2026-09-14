import { Preferences } from '@capacitor/preferences';

const KEYS = {
  profile: 'wallaa.safe.profile',
  contacts: 'wallaa.safe.contacts',
  device: 'wallaa.safe.device',
  armed: 'wallaa.safe.armed',
  trigger: 'wallaa.safe.trigger',
  activities: 'wallaa.safe.activities',
  networkIdentity: 'wallaa.safe.network.identity',
  connectionGuard: 'wallaa.safe.connection.guard',
  appearance: 'wallaa.safe.appearance',
  activeAlert: 'wallaa.safe.active.alert',
  backgroundConfig: 'wallaa.safe.background.config',
  nativeAlert: 'wallaa.safe.native.alert'
};

async function getJson(key, fallback) {
  try {
    const { value } = await Preferences.get({ key });
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

async function setJson(key, value) {
  await Preferences.set({ key, value: JSON.stringify(value) });
}

export const storage = {
  getProfile: () => getJson(KEYS.profile, { name: '', firstName: '', lastName: '', email: '', phone: '', countryCode: '+39', safetyWord: '', plan: 'basic', sosLocationEnabled: true, onboardingComplete: false }),
  setProfile: (value) => setJson(KEYS.profile, value),
  getContacts: () => getJson(KEYS.contacts, []),
  setContacts: (value) => setJson(KEYS.contacts, value),
  getDevice: () => getJson(KEYS.device, null),
  setDevice: (value) => setJson(KEYS.device, value),

  async getArmed() {
    const { value } = await Preferences.get({ key: KEYS.armed });
    return value == null ? true : value === 'true';
  },
  setArmed: (value) => Preferences.set({ key: KEYS.armed, value: String(Boolean(value)) }),

  async getTrigger() {
    const { value } = await Preferences.get({ key: KEYS.trigger });
    return value || 'double_press';
  },
  setTrigger: (value) => Preferences.set({ key: KEYS.trigger, value }),

  getActivities: () => getJson(KEYS.activities, []),
  setActivities: (value) => setJson(KEYS.activities, value),
  getNetworkIdentity: () => getJson(KEYS.networkIdentity, null),
  setNetworkIdentity: (value) => setJson(KEYS.networkIdentity, value),
  getConnectionGuard: () => getJson(KEYS.connectionGuard, { enabled: true, delaySeconds: 60 }),
  setConnectionGuard: (value) => setJson(KEYS.connectionGuard, value),
  getAppearance: () => getJson(KEYS.appearance, { mode: 'system' }),
  setAppearance: (value) => setJson(KEYS.appearance, value),
  getActiveAlert: () => getJson(KEYS.activeAlert, null),
  setActiveAlert: (value) => setJson(KEYS.activeAlert, value),
  getBackgroundConfig: () => getJson(KEYS.backgroundConfig, null),
  setBackgroundConfig: (value) => setJson(KEYS.backgroundConfig, value),
  getNativeAlert: () => getJson(KEYS.nativeAlert, null),
  setNativeAlert: (value) => setJson(KEYS.nativeAlert, value),
  clearNativeAlert: () => Preferences.remove({ key: KEYS.nativeAlert }),

  async clearAll() {
    await Promise.all(Object.values(KEYS).map((key) => Preferences.remove({ key })));
  }
};
