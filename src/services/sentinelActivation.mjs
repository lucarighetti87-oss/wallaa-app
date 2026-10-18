export function recentSentinelFix(location,now=Date.now()){
 const at=Date.parse(location?.capturedAt||'');
 return Boolean(location&&Number.isFinite(at)&&now-at>=0&&now-at<=60000);
}
export async function updateSentinelAvailability({available,cached,setAvailability,saveNative,locate,publish,now=Date.now()}){
 await setAvailability(available);
 await saveNative({active:available,available,status:available?'available':'offline',syncedAt:new Date(now).toISOString()});
 if(!available)return;
 const fix=recentSentinelFix(cached,now)?cached:await locate();
 if(!recentSentinelFix(fix))throw new Error('Sentinel attiva. La posizione non è ancora aggiornata: verifica il permesso di posizione e riprova.');
 await publish(fix);
}
