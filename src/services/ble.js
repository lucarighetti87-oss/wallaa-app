import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { BTHOME_UUID } from '../config';
import { findBTHomeData, parseBTHomeServiceData } from './bthome';

let initialized = false;
let scanning = false;
let lastFingerprint = '';

async function ensureBle() {
  if (initialized) return;
  await BleClient.initialize({ androidNeverForLocation: false });
  initialized = true;
}

function normalizeAdvertisedName(result) {
  return String(result?.localName || result?.device?.name || '').trim();
}

function permanentHardwareIdentity(result) {
  const advertisedName = normalizeAdvertisedName(result);
  const compact = advertisedName.toUpperCase().replace(/\s+/g, '');
  const serialMatch = compact.match(/(?:KBPRO|WALLAA)[_:-]?([A-Z0-9]{5,})$/i);
  if (serialMatch) {
    return {
      hardwareId: `WALLAA:${serialMatch[1].toUpperCase()}`,
      identitySource: 'advertised-serial',
      portableIdentity: true,
      advertisedName
    };
  }

  // KKM K11 factory names normally expose a unique numeric/alphanumeric suffix.
  // Accept other non-generic names only when they contain a sufficiently long unique suffix.
  const suffix = compact.match(/[_:-]([A-Z0-9]{5,})$/);
  if (suffix && !['BUTTON', 'SAFETY', 'BEACON'].includes(suffix[1])) {
    return {
      hardwareId: `WALLAA:${suffix[1].toUpperCase()}`,
      identitySource: 'advertised-name',
      portableIdentity: true,
      advertisedName
    };
  }

  return {
    hardwareId: '',
    identitySource: 'ios-peripheral',
    portableIdentity: false,
    advertisedName
  };
}

function normalizedDevice(result) {
  return {
    id: result.device?.deviceId,
    name: 'Wallaa Button',
    rssi: result.rssi ?? null,
    ...permanentHardwareIdentity(result)
  };
}

function decodeResult(result) {
  const data = findBTHomeData(result.serviceData || {});
  if (!data) return null;
  const parsed = parseBTHomeServiceData(data);
  if (!parsed) return null;
  return { ...normalizedDevice(result), ...parsed };
}

function fingerprint(decoded) {
  return [decoded.id, decoded.packetId ?? 'x', decoded.buttonCode ?? 'x'].join(':');
}

export async function stopBleScan() {
  if (!scanning) return;
  try { await BleClient.stopLEScan(); }
  finally { scanning = false; }
}

export async function pairWallaaButton({ onProgress } = {}) {
  if (!Capacitor.isNativePlatform() && !navigator.bluetooth) {
    throw new Error('Bluetooth non disponibile in questo browser. Usa l’app su iPhone/Android.');
  }

  await ensureBle();
  await stopBleScan();

  return new Promise(async (resolve, reject) => {
    let timer;
    try {
      onProgress?.('scanning');
      scanning = true;

      await BleClient.requestLEScan(
        { services: [BTHOME_UUID], allowDuplicates: true },
        async (result) => {
          const decoded = decodeResult(result);
          if (!decoded?.id) return;
          onProgress?.('found', decoded);

          // Durante il pairing accettiamo il dispositivo solo dopo una vera pressione,
          // così evitiamo di associare beacon BTHome casuali nelle vicinanze.
          if (!decoded.button) return;

          clearTimeout(timer);
          await stopBleScan();
          resolve({
            id: decoded.id,
            name: 'Wallaa Button',
            battery: decoded.battery ?? null,
            pairingPacketId: decoded.packetId ?? null,
            pairingButtonEvent: decoded.button || null,
            pairedAt: new Date().toISOString()
          });
        }
      );

      timer = setTimeout(async () => {
        await stopBleScan();
        reject(new Error('Nessun Wallaa Button rilevato. Premi il pulsante e riprova.'));
      }, 30000);
    } catch (error) {
      clearTimeout(timer);
      await stopBleScan().catch(() => {});
      reject(error);
    }
  });
}

export async function startWallaaMonitor({ deviceId, onEvent, onTelemetry, onError }) {
  if (!deviceId) return;
  await ensureBle();
  await stopBleScan();
  lastFingerprint = '';

  try {
    scanning = true;
    await BleClient.requestLEScan(
      { services: [BTHOME_UUID], allowDuplicates: true },
      (result) => {
        try {
          const decoded = decodeResult(result);
          if (!decoded || decoded.id !== deviceId) return;

          onTelemetry?.({
            battery: decoded.battery,
            rssi: decoded.rssi,
            seenAt: new Date().toISOString(),
            hardwareId: decoded.hardwareId || '',
            advertisedName: decoded.advertisedName || '',
            identitySource: decoded.identitySource || '',
            portableIdentity: decoded.portableIdentity === true
          });

          if (!decoded.button) return;
          const fp = fingerprint(decoded);
          if (fp === lastFingerprint) return;
          lastFingerprint = fp;

          onEvent?.({
            event: decoded.button,
            packetId: decoded.packetId,
            battery: decoded.battery,
            rssi: decoded.rssi,
            at: new Date().toISOString()
          });
        } catch (error) {
          onError?.(error);
        }
      }
    );
  } catch (error) {
    scanning = false;
    throw error;
  }
}
