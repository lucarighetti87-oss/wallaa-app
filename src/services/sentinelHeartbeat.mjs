// Visible app discovers membership before requesting a moderate fallback fix.
// Background tracking remains native; ordinary/offline accounts never request GPS.
export async function pollSentinelMembership({identity,native,send,cached=null,locate}){
 const result=await send(identity,cached);
 if(result?.ignored===true || !result?.status || result.status==='offline' || cached)return result;
 try {const location=await locate();return location?await send(identity,location):result;}catch{return result;}
}
