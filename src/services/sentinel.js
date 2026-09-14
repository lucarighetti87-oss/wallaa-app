import { CONFIG } from '../config';

function headers(identity) {
  return {
    'Content-Type': 'application/json',
    ...(identity?.installationId ? { 'x-wallaa-installation-id': identity.installationId } : {}),
    ...(identity?.authToken ? { 'x-wallaa-install-token': identity.authToken } : {})
  };
}

async function request(path, { method = 'GET', identity, body } = {}) {
  const response = await fetch(`${CONFIG.apiBaseUrl}${path}`, {
    method,
    headers: headers(identity),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Sentinel non disponibile (${response.status})`);
    error.code = payload.code || 'SENTINEL_ERROR';
    error.status = response.status;
    throw error;
  }
  return payload;
}

function firstValue(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function booleanValue(value) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  const text = String(value ?? '').toLowerCase();
  if (text === 'true' || text === 'yes') return true;
  if (text === 'false' || text === 'no') return false;
  return undefined;
}

export function normalizeSentinel(raw = {}, index = 0) {
  const latitude = finiteNumber(firstValue(raw, ['latitude', 'lat']));
  const longitude = finiteNumber(firstValue(raw, ['longitude', 'lng', 'lon']));
  const distanceM = finiteNumber(firstValue(raw, ['distanceM', 'distance_m', 'distanceMeters', 'distance_meters', 'distance']));
  const bearingDeg = finiteNumber(firstValue(raw, ['bearingDeg', 'bearing_deg', 'bearing', 'bearingDegrees']));
  const completedInterventions = finiteNumber(firstValue(raw, ['completedInterventions', 'completed_interventions', 'interventions']));
  const edgeOnly = booleanValue(firstValue(raw, ['edgeOnly', 'edge_only', 'outsideViewport', 'outside_viewport'])) === true;
  const status = String(firstValue(raw, ['status', 'effectiveStatus', 'effective_status']) || 'available').toLowerCase();

  return {
    ...raw,
    id: firstValue(raw, ['id', 'userId', 'user_id', 'sentinelUserId', 'sentinel_user_id']) || `sentinel-${index}`,
    latitude,
    longitude,
    distanceM,
    bearingDeg,
    edgeOnly,
    status,
    statusLabel: firstValue(raw, ['statusLabel', 'status_label']) || (status === 'busy' ? 'Occupato' : 'Disponibile'),
    completedInterventions
  };
}

export function normalizeNearbyPayload(payload) {
  const source = Array.isArray(payload)
    ? payload
    : (payload?.sentinels || payload?.nearby || payload?.items || payload?.results || []);
  const sentinels = Array.isArray(source) ? source.map(normalizeSentinel) : [];
  return {
    ...(payload && !Array.isArray(payload) ? payload : {}),
    sentinels,
    count: sentinels.length
  };
}

export const getSentinelProfile = (identity) => request('/api/sentinel/me', { identity });
export const applyAsSentinel = (identity) => request('/api/sentinel/apply', { method: 'POST', identity, body: {} });
export const setSentinelAvailability = (identity, available) => request('/api/sentinel/availability', { method: 'POST', identity, body: { available: Boolean(available) } });
export const sendSentinelPresence = (identity, location) => request('/api/sentinel/presence', {
  method: 'POST',
  identity,
  body: {
    latitude: location?.latitude,
    longitude: location?.longitude,
    accuracy: location?.accuracy,
    heading: location?.heading ?? null
  }
});
export async function getNearbySentinels(identity, location) {
  const lat = finiteNumber(location?.latitude);
  const lng = finiteNumber(location?.longitude);
  const qs = lat !== null && lng !== null
    ? `?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}`
    : '';
  return normalizeNearbyPayload(await request(`/api/sentinel/nearby${qs}`, { identity }));
}
export const acceptSentinelOffer = (identity, offerId) => request(`/api/sentinel/offers/${encodeURIComponent(offerId)}/accept`, { method: 'POST', identity, body: {} });
export const declineSentinelOffer = (identity, offerId) => request(`/api/sentinel/offers/${encodeURIComponent(offerId)}/decline`, { method: 'POST', identity, body: {} });
export const completeSentinelIncident = (identity, incidentId) => request(`/api/sentinel/incidents/${encodeURIComponent(incidentId)}/complete`, { method: 'POST', identity, body: {} });
