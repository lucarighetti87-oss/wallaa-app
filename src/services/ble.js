import { Preferences } from '@capacitor/preferences';
import { MOKO_SERVICE_UUIDS, findMokoData, parseMokoAlarm, parseMokoDeviceInfo, mokoCounterKey, consumeMokoFrame } from './mokoButton';
import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { BTHOME_UUID } from '../config';
import { findBTHomeData, parseBTHomeServiceData } from './bthome';

let initialized = false;
let scanning = false;
let lastFingerprint = '';
const mokoIdentities = new Map();
const SCAN_SERVICES = [BTHOME_UUID, ...MOKO_SERVICE_UUIDS];

async function ensureBle() {
  if (initialized) return;
  await BleClient.initialize({ androidNeverForLocation: false });
  initialized = true;
}

function normalizeAdvertisedName(result) {
  return String(result?.localName || result?.device?.name || '').trim();
}

function dataViewBytes(value) {
  if (!value) return null;
  try {
    if (value instanceof DataView) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    if (Array.isArray(value)) return Uint8Array.from(value);
  } catch {}
  return null;
}

// Shelly Manufacturer Specific Data: MFID 0x0BA9.
// Block 0x0A contains the permanent 6-byte MAC address.
function shellyHardwareIdentity(result) {
  const manufacturerData = result?.manufacturerData;
  if (!manufacturerData) return null;

  const candidates = [];

  if (manufacturerData instanceof Map) {
    for (const [key, value] of manufacturerData.entries()) {
      candidates.push([Number(key), value]);
    }
  } else if (typeof manufacturerData === 'object') {
    for (const [key, value] of Object.entries(manufacturerData)) {
      candidates.push([Number(key), value]);
    }
  }

  const shelly = candidates.find(([key]) => key === 0x0BA9 || key === 2985);
  if (!shelly) return null;

  const bytes = dataViewBytes(shelly[1]);
  if (!bytes || bytes.length < 7) return null;

  const blockLengths = new Map([
    [0x01, 2],
    [0x0A, 6],
    [0x0B, 2]
  ]);

  let offset = 0;
  while (offset < bytes.length) {
    const type = bytes[offset++];
    const length = blockLengths.get(type);
    if (!length || offset + length > bytes.length) break;

    if (type === 0x0A) {
      const macBytes = bytes.slice(offset, offset + 6);
      const mac = Array.from(macBytes)
        .map((byte) => byte.toString(16).padStart(2, '0').toUpperCase())
        .join(':');

      return {
        hardwareId: `SHELLY:${mac.replace(/:/g, '')}`,
        identitySource: 'shelly-mac',
        portableIdentity: true,
        mac
      };
    }

    offset += length;
  }

  return null;
}

function permanentHardwareIdentity(result) {
  const advertisedName = normalizeAdvertisedName(result);

  const shellyIdentity = shellyHardwareIdentity(result);
  if (shellyIdentity) {
    return { ...shellyIdentity, advertisedName };
  }

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
  const info = parseMokoDeviceInfo(findMokoData(result.serviceData, 'ea00'));
  if (info && result.device?.deviceId) mokoIdentities.set(result.device.deviceId, info);
  const alarm = parseMokoAlarm(findMokoData(result.serviceData, 'fee0'));
  if (alarm) {
    const identity = info || mokoIdentities.get(result.device?.deviceId);
    return { ...normalizedDevice(result), ...identity, ...alarm };
  }
  if (info) return { ...normalizedDevice(result), ...info, protocol:'moko-button', button:null, counter:null, frameType:null };
  const data = findBTHomeData(result.serviceData || {});
  if (!data) return null;
  const parsed = parseBTHomeServiceData(data);
  if (!parsed) return null;
  return { ...normalizedDevice(result), ...parsed };
}

function fingerprint(decoded) {
  if (decoded.protocol === 'moko-button') return [decoded.id, decoded.frameType, decoded.counter].join(':');
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
    let finishing = false;
    try {
      onProgress?.('scanning');
      scanning = true;

      await BleClient.requestLEScan(
        { services: SCAN_SERVICES, allowDuplicates: true },
        async (result) => {
          const decoded = decodeResult(result);
          if (!decoded?.id || finishing) return;
          onProgress?.('found', decoded);

          // Durante il pairing accettiamo il dispositivo solo dopo una vera pressione,
          // così evitiamo di associare beacon BTHome casuali nelle vicinanze.
          if (!decoded.button || (decoded.protocol === 'moko-button' && !decoded.hardwareId?.startsWith('MOKO:'))) return;
          finishing = true;
          clearTimeout(timer);
          if (decoded.protocol === 'moko-button') {
            try {
              await Preferences.set({ key: mokoCounterKey(decoded.hardwareId), value: JSON.stringify({ [decoded.frameType]: decoded.counter }) });
            } catch (error) { await stopBleScan().catch(() => {}); reject(error); return; }
          }
          await stopBleScan();
          resolve({
            id: decoded.id,
            protocol: decoded.protocol || 'bthome',
            name: 'Wallaa Button',
            battery: decoded.battery ?? null,
            hardwareId: decoded.hardwareId || '',
            advertisedName: decoded.advertisedName || '',
            identitySource: decoded.identitySource || '',
            portableIdentity: decoded.portableIdentity === true,
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

export async function startWallaaMonitor({ deviceId, hardwareId, communityEnabled = false, onCommunityObservation, onEvent, onTelemetry, onError }) {
  if (!deviceId && !communityEnabled) return;
  await ensureBle();
  await stopBleScan();
  lastFingerprint = '';
  let queue = Promise.resolve();

  try {
    scanning = true;
    await BleClient.requestLEScan(
      { services: SCAN_SERVICES, allowDuplicates: true },
      (result) => {
        queue = queue.then(async () => {
        try {
          const decoded = decodeResult(result);
          if (!decoded) return;
          if (communityEnabled && decoded.id !== deviceId && decoded.protocol === 'moko-button' && decoded.hardwareId?.startsWith('MOKO:') && Number.isFinite(decoded.rssi)) {
            onCommunityObservation?.({hardwareId:decoded.hardwareId,rssi:decoded.rssi,observedAt:new Date().toISOString()});
          }
          if (decoded.id !== deviceId) return;
          if (decoded.protocol === 'moko-button') {
            if (!hardwareId?.startsWith('MOKO:') || (decoded.hardwareId && decoded.hardwareId !== hardwareId)) return;
            const key = mokoCounterKey(hardwareId);
            const stored = await Preferences.get({ key });
            let counters = {};
            try { counters = JSON.parse(stored.value || '{}'); } catch {}
            if (!counters || typeof counters !== 'object' || Array.isArray(counters)) counters = {};
            if (Number.isInteger(decoded.counter) && Number.isInteger(decoded.frameType)) {
              const next = consumeMokoFrame(decoded, counters);
              await Preferences.set({ key, value: JSON.stringify(next.counters) });
              if (!next.emit) decoded.button = null;
            }
          }

          onTelemetry?.({
            protocol: decoded.protocol || 'bthome',
            motion: decoded.motion, acceleration: decoded.acceleration, batteryVoltageMv: decoded.batteryVoltageMv,
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
        }).catch(error => onError?.(error));
      }
    );
  } catch (error) {
    scanning = false;
    throw error;
  }
}
