const alertUrl = import.meta.env.VITE_ALERT_API_URL || 'http://localhost:8787/api/alert';

export const CONFIG = {
  safetyNoticeUrl: 'https://wallaasafety.com/legal/wallaa-safety-notice-2.1-2026-09-16.pdf',
  termsUrl: 'https://wallaasafety.com/legal/wallaa-terms-2.1-2026-09-16.pdf',
  privacyPolicyUrl: 'https://wallaasafety.com/legal/wallaa-privacy-policy-2.1-2026-09-16.pdf',
  safetyNoticeVersion: '2.1',
  termsVersion: '2.1',
  privacyPolicyVersion: '2.1',
  apiUrl: alertUrl,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || alertUrl.replace(/\/api\/alert\/?$/, ''),
  demoMode: String(import.meta.env.VITE_DEMO_MODE || 'false').toLowerCase() === 'true',
  privacyPolicyUrl: import.meta.env.VITE_PRIVACY_POLICY_URL || 'https://wallaasafety.com/privacy-policy',
  termsUrl: import.meta.env.VITE_TERMS_URL || 'https://wallaasafety.com/terms-and-conditions',
  safetyNoticeUrl: import.meta.env.VITE_SAFETY_NOTICE_URL || 'https://wallaasafety.com/safety-notice',
  privacyChoicesUrl: import.meta.env.VITE_PRIVACY_CHOICES_URL || 'https://wallaasafety.com/privacy-choices',
  privacyContactEmail: import.meta.env.VITE_PRIVACY_CONTACT_EMAIL || 'safety@wallaasafety.com',
  privacyPolicyVersion: import.meta.env.VITE_PRIVACY_POLICY_VERSION || 'privacy-2.0-2026-09-14',
  termsVersion: import.meta.env.VITE_TERMS_VERSION || 'terms-2.0-2026-09-14',
  safetyNoticeVersion: import.meta.env.VITE_SAFETY_NOTICE_VERSION || 'safety-2.0-2026-09-14'
};

export const TRIGGERS = [
  { value: 'press', label: '1 click', short: 'Singolo' },
  { value: 'double_press', label: '2 click', short: 'Doppio' },
  { value: 'triple_press', label: '3 click', short: 'Triplo' },
  { value: 'long_press', label: 'Pressione continua', short: 'Continua' },
  { value: 'any_press', label: 'Click casuali', short: 'Qualsiasi' }
];

export function triggerMatches(configured, event) {
  if (!event) return false;
  if (configured === 'any_press') return ['press','double_press','triple_press','long_press','long_double_press','long_triple_press','hold_press'].includes(event);
  return configured === event;
}

export const BTHOME_UUID = '0000fcd2-0000-1000-8000-00805f9b34fb';
export const QR_PREFIX = 'WALLAA:PAIR:';
