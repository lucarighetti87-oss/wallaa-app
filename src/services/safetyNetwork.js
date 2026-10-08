// One person per identity: cloud contacts, QR links and reciprocal relationships.
export function safetyPeople(contacts=[], network={}) {
  const people=new Map();
  for(const c of contacts){const key=c.networkUserId||`contact:${c.id}`;people.set(key,{...c,key,isWallaa:Boolean(c.networkUserId),receives:true,protects:false});}
  for(const [direction,rows] of [['receives',network.guardians||[]],['protects',network.following||[]]]){
    for(const row of rows){const key=row.userId;const prior=people.get(key);people.set(key,{...prior,key,id:prior?.id,name:prior?.name||row.displayName,networkUserId:key,isWallaa:true,role:prior?.role||row.role,permissions:prior?.permissions||row.permissions,...(!prior?{receives:false,protects:false}:{}),[direction]:true,[direction==='receives'?'guardianLinkId':'followingLinkId']:row.linkId});}
  }
  return [...people.values()];
}
