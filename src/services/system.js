import { CONFIG } from '../config';

function authHeaders(identity, json = false) {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(identity?.installationId ? { 'x-wallaa-installation-id': identity.installationId } : {}),
    ...(identity?.authToken ? { 'x-wallaa-install-token': identity.authToken } : {})
  };
}

export async function getWallaaSystemHealth(identity) {
  const response = await fetch(`${CONFIG.apiBaseUrl}/api/system/diagnostics`, {
    method: 'GET', headers: authHeaders(identity), cache: 'no-store'
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Wallaa API ${response.status}`);
  return payload;
}

export async function sendWallaaTestEmail(identity, { email, name = 'Utente Wallaa' } = {}) {
  const response = await fetch(`${CONFIG.apiBaseUrl}/api/system/test-email`, {
    method: 'POST', headers: authHeaders(identity, true), body: JSON.stringify({ email, name })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Wallaa API ${response.status}`);
  return payload;
}
