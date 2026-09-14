import { CONFIG } from '../config';
import { getCurrentLocation } from './location';

const uiBeat = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendWallaaAlert({ profile, contacts, trigger, device, networkIdentity, eventPacketId = null, locationEnabled = true, onProgress = null }) {
  const validContacts = contacts.filter((c) => c.email?.trim() && c.permissions?.sosAlerts !== false);
  if (!validContacts.length && !networkIdentity?.authToken) {
    throw new Error('Aggiungi almeno un contatto email abilitato agli SOS o collega una persona nella Rete Wallaa.');
  }

  let location = null;
  if (locationEnabled) {
    onProgress?.('location');
    await uiBeat(220);
    location = await getCurrentLocation();
  }
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();

  onProgress?.('guardians');
  await uiBeat(260);
  const response = await fetch(CONFIG.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(networkIdentity?.installationId ? { 'x-wallaa-installation-id': networkIdentity.installationId } : {}),
      ...(networkIdentity?.authToken ? { 'x-wallaa-install-token': networkIdentity.authToken } : {})
    },
    body: JSON.stringify({
      userName: fullName || profile.name?.trim() || 'Utente Wallaa Safe Button',
      userPhone: profile.phone?.trim() || '',
      safetyWord: profile.safetyWord?.trim() || '',
      language: profile.language || 'en',
      trigger,
      eventPacketId: Number.isFinite(Number(eventPacketId)) ? Number(eventPacketId) : null,
      device: device ? { name: 'Wallaa Button', id: device.id, hardwareId: device.hardwareId || '', claimToken: device.claimToken || '' } : null,
      contacts: validContacts.map(({ name, email, phone, permissions, role }) => ({ name, email, phone, permissions, role })),
      location
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Errore invio alert (${response.status})`);
    error.code = body.code || '';
    error.details = body;
    throw error;
  }

  onProgress?.('complete');
  return { ...body, location };
}
