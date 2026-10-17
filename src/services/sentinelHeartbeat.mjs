// Discover membership without GPS. On iOS the native service owns background location.
export async function pollSentinelMembership({identity,native,send,cached=null,locate}){
 const result=await send(identity,cached);
 if(native || result?.ignored===true || !result?.status || result.status==='offline' || cached)return result;
 try {const location=await locate();return location?await send(identity,location):result;}catch{return result;}
}
