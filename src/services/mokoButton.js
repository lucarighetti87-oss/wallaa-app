// MK Button Alarm Info / FEE0 and Device Info / EA00.
// Reference: MOKO 14-iOS-MKButton-SDK, commit 47a998e95ade5814ceab925d95c18d187e196de8.
export const MOKO_SERVICE_UUIDS = ['0000fee0-0000-1000-8000-00805f9b34fb', '0000ea00-0000-1000-8000-00805f9b34fb'];
const EVENTS = { 0x20: 'press', 0x21: 'double_press', 0x22: 'long_press' };
function bytes(input) {
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (Array.isArray(input)) return Uint8Array.from(input);
  return new Uint8Array();
}
export function findMokoData(serviceData, uuid) {
  const entries = serviceData instanceof Map ? [...serviceData] : Object.entries(serviceData || {});
  const short = uuid.toLowerCase();
  return entries.find(([key]) => {
    const name = String(key).toLowerCase();
    return name === short || name === `0000${short}-0000-1000-8000-00805f9b34fb`;
  })?.[1];
}
export function parseMokoAlarm(input) {
  const data = bytes(input);
  // Only single-button MK Button formats: 3–6-byte Device ID, firmware type 0/1.
  if (data.length < 9 || data.length > 12 || !EVENTS[data[0]] || data[data.length - 2] > 1) return null;
  const counter = data[2] * 256 + data[3]; // numeric representation used by the vendor iOS SDK
  return {
    protocol: 'moko-button', frameType: data[0], counter,
    motion: data[data.length - 1] === 1, triggered: Boolean(data[1] & 0x02), button: data[1] & 0x02 ? EVENTS[data[0]] : null,
    buttonCode: data[0] === 0x22 ? 4 : data[0] === 0x21 ? 2 : 1,
    // The complete counter is retained for deduplication. The updated server accepts the complete 16-bit MK Button counter.
    packetId: counter, deviceCode: [...data.slice(4, -2)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
  };
}
export function parseMokoDeviceInfo(input) {
  const data = bytes(input);
  if (data.length !== 21 || data[0] !== 0) return null;
  const macBytes = [...data.slice(15, 21)];
  if (macBytes.every(x => x === 0) || macBytes.every(x => x === 255)) return null;
  const mac = macBytes.map(x => x.toString(16).padStart(2, '0').toUpperCase()).join('');
  const power = data[13] * 256 + data[14];
  const signed16 = (offset) => { const raw = data[offset] * 256 + data[offset + 1]; return raw > 32767 ? raw - 65536 : raw; };
  return { hardwareId: `MOKO:${mac}`, identitySource: 'moko-mac', portableIdentity: true, battery: power <= 100 ? power : null, batteryVoltageMv: power > 100 ? power : null, acceleration: { x: signed16(4), y: signed16(6), z: signed16(8) } };
}
export function mokoCounterKey(hardwareId) { return `wallaa.safe.moko.counters.${String(hardwareId).toUpperCase()}`; }
export function consumeMokoFrame(frame, counters = {}) {
  const key = String(frame.frameType);
  const prior = counters[key];
  // An unknown stream is baselined, never treated as a fresh press just because an alarm is already broadcasting.
  const emit = frame.triggered && Number.isInteger(prior) && prior !== frame.counter;
  // A standby packet can precede the alarm packet for the same new click.
  // Do not consume that click until its alarm packet has been processed.
  return { emit, counters: { ...counters, [key]: Number.isInteger(prior)&&!frame.triggered?prior:frame.counter } };
}
