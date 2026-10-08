export const RADIO_MAX_AGE_MS=45000;
export function freshRadio(reading,now=Date.now()){
 const value=reading?.rssi,at=Date.parse(reading?.rssiSampledAt||'');
 return Number.isFinite(value)&&value>=-127&&value<=0&&Number.isFinite(at)&&now-at>=0&&now-at<=RADIO_MAX_AGE_MS;
}
export function mergeMokoTelemetry(previous={},status={},now=Date.now()){
 const result={...previous,...status.telemetry,seenAt:new Date(now).toISOString()};
 const candidate={rssi:status.rssi,rssiSampledAt:status.rssiSampledAt,rssiSource:'connection'};
 const usable=freshRadio(candidate,now);
 const oldUsable=freshRadio(previous,now);
 const chooseNew=usable&&(!oldUsable||Date.parse(candidate.rssiSampledAt)>=Date.parse(previous.rssiSampledAt));
 const selected=chooseNew?candidate:oldUsable?previous:null;
 result.rssi=selected?.rssi??null;result.rssiSampledAt=selected?.rssiSampledAt??null;result.rssiSource=selected?.rssiSource??null;
 return result;
}
