import test from 'node:test';
import assert from 'node:assert/strict';
import {healthNotificationEntries} from '../src/services/healthNotifications.js';
const first='2026-10-10T02:55:00Z',clear='2026-10-10T02:56:00Z',next='2026-10-10T03:00:00Z';
test('clearing removes both past history and the old pending entry without modifying the check',()=>{
 const cycle={id:'pending',status:'email_sent',needsAcknowledgement:true,startedAt:first,notificationAt:first};
 assert.deepEqual(healthNotificationEntries([{id:'past',startedAt:first}],cycle,clear),[]);
 assert.equal(cycle.needsAcknowledgement,true);
});
test('a newly sent reminder for the same check is visible after clear',()=>{
 const cycle={id:'pending',status:'pending',stage:2,startedAt:first,notificationAt:next};
 assert.equal(healthNotificationEntries([],cycle,clear).length,1);
});
test('history and live state produce one item per check and retain delivery counts',()=>{
 const history=[{id:'same',startedAt:first,notificationAt:next,remindersCompleted:3,emailsSent:2}];
 const cycle={id:'same',startedAt:first,notificationAt:next,status:'email_sent',needsAcknowledgement:true};
 const entries=healthNotificationEntries(history,cycle);assert.equal(entries.length,1);assert.equal(entries[0].emailsSent,2);
});
