export function sentinelOfferState(offer, now=Date.now()) {
  if(!offer)return {available:false,remainingSeconds:0,message:''};
  const expires=Date.parse(offer.expiresAt||'');
  const remainingSeconds=Number.isFinite(expires)?Math.max(0,Math.ceil((expires-now)/1000)):0;
  if(offer.reason==='sos_closed')return {available:false,remainingSeconds:0,message:'La persona ha chiuso l’SOS. Questa richiesta non è più attiva.'};
  if(offer.reason==='assigned')return {available:false,remainingSeconds:0,message:'Un’altra Sentinel ha già accettato questa richiesta.'};
  if(offer.reason==='declined')return {available:false,remainingSeconds:0,message:'Hai rifiutato questa richiesta.'};
  if(offer.reason==='accepted')return {available:false,remainingSeconds:0,message:'Hai già accettato questa richiesta.'};
  if(offer.reason==='expired'||(Number.isFinite(expires)&&remainingSeconds===0))return {available:false,remainingSeconds:0,message:'Il tempo per rispondere è terminato. La ricerca di una Sentinel continua.'};
  if(offer.reason==='unavailable')return {available:false,remainingSeconds:0,message:'Questa richiesta non è più disponibile.'};
  if(offer.actionable===true&&remainingSeconds>0)return {available:true,remainingSeconds,message:`Tempo per rispondere: ${remainingSeconds} s`};
  return {available:false,checking:true,remainingSeconds,message:'Verifica della richiesta in corso…'};
}
