const BUTTON_EVENTS = {
  0x00: null,
  0x01: 'press',
  0x02: 'double_press',
  0x03: 'triple_press',
  0x04: 'long_press',
  0x05: 'long_double_press',
  0x06: 'long_triple_press',
  0x80: 'hold_press',
  0xfe: 'hold_press'
};

function toBytes(input) {
  if (!input) return new Uint8Array();
  if (input instanceof DataView) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (Array.isArray(input)) return Uint8Array.from(input);
  throw new TypeError('Formato BTHome non supportato');
}

/**
 * Decodifica il service-data BTHome v2 (UUID FCD2 escluso dal DataView del plugin).
 * Per Wallaa Safe Button ci interessano packet id, batteria e button event.
 */
export function parseBTHomeServiceData(input) {
  const bytes = toBytes(input);
  if (bytes.length < 1) return null;

  const deviceInfo = bytes[0];
  const encrypted = Boolean(deviceInfo & 0x01);
  if (encrypted) {
    return { encrypted: true, button: null, packetId: null, battery: null };
  }

  let packetId = null;
  let battery = null;
  let button = null;
  let buttonCode = null;

  // Il Wallaa Button compatibile invia oggetti semplici 00, 01 e 3A.
  // Il parser è volutamente conservativo: gli oggetti sconosciuti non vengono
  // interpretati, ma cerchiamo comunque l'evento button in modo sicuro.
  for (let i = 1; i < bytes.length - 1; i++) {
    const id = bytes[i];
    const value = bytes[i + 1];

    if (id === 0x00) {
      packetId = value;
      i += 1;
      continue;
    }
    if (id === 0x01) {
      battery = value;
      i += 1;
      continue;
    }
    if (id === 0x3a) {
      buttonCode = value;
      button = BUTTON_EVENTS[value] ?? null;
      i += 1;
      continue;
    }
  }

  return {
    encrypted: false,
    deviceInfo,
    packetId,
    battery,
    buttonCode,
    button
  };
}

export function findBTHomeData(serviceData = {}) {
  const entries = Object.entries(serviceData);
  const found = entries.find(([key]) => key.toLowerCase().includes('fcd2'));
  return found?.[1] || null;
}
