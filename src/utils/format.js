import { localeForLanguage, translate } from '../i18n';

export function formatDateTime(value, language = 'en') {
  if (!value) return '—';
  const d = new Date(value);
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

export function formatTime(value, language = 'en') {
  if (!value) return '—';
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value));
}

export function triggerLabel(trigger, language = 'en') {
  const key = {
    press: 'trigger.press.label',
    double_press: 'trigger.double_press.label',
    triple_press: 'trigger.triple_press.label',
    long_press: 'trigger.long_press.label',
    hold_press: 'trigger.hold_press.label',
    manual_test: 'trigger.manual_test.label',
    manual_sos: 'trigger.manual_sos.label'
  }[trigger];
  return key ? translate(language, key) : trigger || translate(language, 'trigger.event');
}

export function triggerShort(trigger, language = 'en') {
  const key = {
    press: 'trigger.press.short',
    double_press: 'trigger.double_press.short',
    triple_press: 'trigger.triple_press.short',
    long_press: 'trigger.long_press.short'
  }[trigger];
  return key ? translate(language, key) : translate(language, 'trigger.double_press.short');
}

export function activityTitle(entry, language = 'en') {
  if (!entry) return '';
  if (entry.titleKey) return translate(language, entry.titleKey, entry.titleVars || {});
  const legacy = {
    'Test SOS avviato': 'activity.testStarted',
    'Wallaa Button rilevato': 'activity.buttonDetected',
    'Alert inviato': 'activity.alertSent',
    'Invio alert non riuscito': 'activity.alertFailed',
    'Pressione Wallaa Button': 'activity.buttonPress',
    'Wallaa Button associato': 'activity.devicePaired',
    'Wallaa Button scollegato': 'activity.deviceDisconnected'
  };
  if (legacy[entry.title]) return translate(language, legacy[entry.title]);
  const sos = String(entry.title || '').match(/^SOS da (.+)$/);
  if (sos) return translate(language, 'activity.networkSos', { name: sos[1] });
  return entry.title || '';
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}
