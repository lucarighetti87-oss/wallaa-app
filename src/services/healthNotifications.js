const activeStatuses=new Set(['pending','escalating','email_pending','email_sent','email_no_recipients']);
export function healthNotificationEntries(history=[],cycle=null,clearedAt=null){
 const entries=new Map(history.map(item=>[item.id,{...item}]));
 if(cycle&&(cycle.needsAcknowledgement||activeStatuses.has(cycle.status))){
  const previous=entries.get(cycle.id)||{};
  entries.set(cycle.id,{...previous,...cycle,remindersCompleted:previous.remindersCompleted??cycle.stage??0,emailsSent:previous.emailsSent??0});
 }
 const cutoff=clearedAt?Date.parse(clearedAt):0;
 return [...entries.values()].filter(item=>!Number.isFinite(cutoff)||Date.parse(item.notificationAt||item.startedAt)>cutoff);
}
