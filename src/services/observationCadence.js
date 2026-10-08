// Adapt phone reporting; never changes or disables the physical SOS channel.
export function observationIntervalMs(moving){return moving===true?15000:moving===false?45000:30000;}
export function observationDue(item,lastSentAt,now=Date.now()){
 const at=Date.parse(item.observedAt||'');if(!Number.isFinite(at)||at>now||now-at>=60000)return false;
 return !Number.isFinite(lastSentAt)||now-lastSentAt>=observationIntervalMs(item.moving);
}
