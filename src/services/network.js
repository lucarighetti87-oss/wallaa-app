import QRCode from 'qrcode';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerTypeHint
} from '@capacitor/barcode-scanner';
import { CONFIG, QR_PREFIX } from '../config';

function headers(identity, json = true) {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(identity?.installationId ? { 'x-wallaa-installation-id': identity.installationId } : {}),
    ...(identity?.authToken ? { 'x-wallaa-install-token': identity.authToken } : {})
  };
}

async function api(path, { method = 'GET', identity, body } = {}) {
  const response = await fetch(`${CONFIG.apiBaseUrl}${path}`, {
    method,
    headers: headers(identity, body !== undefined),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Errore rete Wallaa (${response.status})`);
    error.status = response.status;
    error.code = payload.code || (response.status === 401 ? 'SESSION_INVALID' : 'HTTP_ERROR');
    throw error;
  }
  return payload;
}

export async function registerWallaaAccount({ installationId, profile, password, platform = 'ios', pushToken = null }) {
  return api('/api/auth/register', {
    method: 'POST',
    body: {
      installationId,
      password,
      platform,
      pushToken,
      profile: {
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        countryCode: profile?.countryCode || '+39',
        dateOfBirth: profile?.dateOfBirth || '',
        privacyAccepted: Boolean(profile?.privacyAccepted),
        termsAccepted: Boolean(profile?.termsAccepted),
        safetyNoticeAccepted: Boolean(profile?.safetyNoticeAccepted),
        privacyPolicyVersion: profile?.privacyPolicyVersion || '',
        termsVersion: profile?.termsVersion || '',
        safetyNoticeVersion: profile?.safetyNoticeVersion || '',
        language: profile?.language || 'en'
      }
    }
  });
}

export async function resendWallaaVerification({ email }) {
  return api('/api/auth/resend-verification', {
    method: 'POST',
    body: { email }
  });
}

export async function loginWallaaAccount({ installationId, identifier, password, platform = 'ios', pushToken = null }) {
  return api('/api/auth/login', {
    method: 'POST',
    body: { installationId, identifier, password, platform, pushToken }
  });
}

export async function logoutWallaaAccount(identity) {
  if (!identity?.authToken) return { ok: true };
  return api('/api/auth/logout', { method: 'POST', identity, body: {} });
}

export async function getWallaaAccount(identity) {
  return api('/api/account/profile', { identity });
}

export async function getWallaaLegalStatus(identity) {
  return api('/api/account/privacy-status', { identity });
}

export async function acceptWallaaLegalDocuments(identity, {
  privacyAccepted = false,
  termsAccepted = false,
  safetyNoticeAccepted = false,
  language = 'en'
} = {}) {
  return api('/api/account/legal-acceptance', {
    method: 'POST',
    identity,
    body: {
      privacyAccepted: Boolean(privacyAccepted),
      termsAccepted: Boolean(termsAccepted),
      safetyNoticeAccepted: Boolean(safetyNoticeAccepted),
      privacyPolicyVersion: CONFIG.privacyPolicyVersion,
      termsVersion: CONFIG.termsVersion,
      safetyNoticeVersion: CONFIG.safetyNoticeVersion,
      language
    }
  });
}

export async function claimWallaaDevice(identity, device) {
  if (!identity?.authToken) throw new Error('Accedi al tuo account Wallaa prima di associare il dispositivo.');
  return api('/api/devices/claim', {
    method: 'POST',
    identity,
    body: {
      hardwareId: device?.hardwareId || '',
      transportId: device?.id || '',
      advertisedName: device?.advertisedName || '',
      identitySource: device?.identitySource || '',
      portableIdentity: device?.portableIdentity !== false
    }
  });
}

export async function getOwnedWallaaDevices(identity) {
  return api('/api/devices/owned', { identity });
}

export async function getWallaaAlerts(identity) {
  return api('/api/account/alerts', { identity });
}

// Authenticated profile / push-token sync. This endpoint never creates an anonymous account in v4.0.5.
export async function registerWallaaIdentity({ identity, displayName, pushToken = null, platform = 'ios', profile = null }) {
  if (!identity?.authToken) throw new Error('Accedi a Wallaa prima di sincronizzare il profilo.');
  return api('/api/network/register', {
    method: 'POST',
    identity,
    body: {
      installationId: identity.installationId,
      displayName: displayName?.trim() || 'Utente Wallaa',
      pushToken,
      platform,
      ...(profile ? { profile: {
        firstName: profile.firstName || '', lastName: profile.lastName || '', email: profile.email || '',
        phone: profile.phone || '',
        countryCode: profile.countryCode || '+39',
        dateOfBirth: profile.dateOfBirth || '',
        language: profile.language || 'en',
        privacyAccepted: Boolean(profile.privacyAccepted),
        termsAccepted: Boolean(profile.termsAccepted),
        liveProtectionEnabled: Boolean(profile.liveProtectionEnabled)
      } } : {})
    }
  });
}

export async function getWallaaContacts(identity) {
  return api('/api/contacts', { identity });
}

export async function syncWallaaContacts(identity, contacts = []) {
  return api('/api/contacts/sync', { method: 'POST', identity, body: { contacts } });
}

export async function getWallaaNetwork(identity) {
  return api('/api/network/me', { identity });
}

export async function scanWallaaCode(identity, rawCode) {
  return api('/api/network/scan', {
    method: 'POST',
    identity,
    body: { code: rawCode }
  });
}

export async function rotateWallaaQr(identity) {
  return api('/api/network/qr/rotate', { method: 'POST', identity, body: {} });
}

export async function removeWallaaLink(identity, linkId) {
  return api(`/api/network/links/${encodeURIComponent(linkId)}`, { method: 'DELETE', identity });
}

export async function getNetworkAlert(identity, alertId) {
  return api(`/api/network/alerts/${encodeURIComponent(alertId)}`, { identity });
}

export async function getWallaaNotificationHistory(identity, limit = 100) {
  return api(`/api/network/notifications?limit=${encodeURIComponent(limit)}`, { identity });
}

export async function clearWallaaNotificationHistory(identity) {
  return api('/api/network/notifications', { method: 'DELETE', identity });
}

export async function acknowledgeActiveNetworkAlerts(identity) {
  return api('/api/network/notifications/ack-active', { method: 'POST', identity, body: {} });
}

export async function createQrDataUrl(payload) {
  if (!payload) return '';
  return QRCode.toDataURL(payload, {
    width: 780,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#061a42', light: '#ffffff' }
  });
}

export async function scanQrWithCamera() {
  const result = await CapacitorBarcodeScanner.scanBarcode({
    hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
    scanInstructions: 'Inquadra il QR Wallaa Safe Button',
    scanButton: false,
    scanText: 'Scansiona QR'
  });
  const code = result?.ScanResult?.trim();
  if (!code) throw new Error('Nessun QR rilevato.');
  if (!code.startsWith(QR_PREFIX)) throw new Error('Questo non è un QR Wallaa Safe Button valido.');
  return code;
}

export async function getWallaaMessageUsers(identity, query) {
  return api(`/api/messages/users?q=${encodeURIComponent(query || '')}`, {
    identity
  });
}

export async function getWallaaConversations(identity) {
  return api('/api/messages/conversations', {
    identity
  });
}

export async function createWallaaConversation(identity, userId) {
  return api('/api/messages/conversations', {
    method: 'POST',
    identity,
    body: { userId }
  });
}

export async function getWallaaConversationMessages(identity, conversationId) {
  return api(
    `/api/messages/conversations/${encodeURIComponent(conversationId)}`,
    { identity }
  );
}

export async function sendWallaaMessage(identity, conversationId, body) {
  return api(
    `/api/messages/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      identity,
      body: { body }
    }
  );
}

export async function deleteWallaaConversation(identity, conversationId) {
  return api(
    `/api/messages/conversations/${encodeURIComponent(conversationId)}`,
    {
      method: 'DELETE',
      identity
    }
  );
}
