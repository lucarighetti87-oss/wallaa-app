export function guardianNotificationActivity(item){
 const disconnect=item.type==='disconnect';
 return {id:`remote-${item.id}`,at:item.createdAt,type:disconnect?'guardian-disconnect':item.type==='sos'?'network-alert':'network-event',
  status:item.type==='sos'?'error':disconnect?'warning':'success',title:item.title,detail:item.body,ownerName:item.ownerName,
  alertId:disconnect?null:item.alertId,location:disconnect?null:item.location};
}
export function mergeGuardianNotifications(current,items){
 const rows=new Map(current.map(item=>[item.id,item]));
 for(const item of items){const row=guardianNotificationActivity(item);rows.set(row.id,{...rows.get(row.id),...row});}
 return [...rows.values()];
}
