import {guardianNotificationActivity,mergeGuardianNotifications} from '../src/services/guardianNotifications.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {safetyPeople} from '../src/services/safetyNetwork.js';
test('a reciprocal QR Guardian and its contact appear once with both directions',()=>{
 const rows=safetyPeople([{id:'contact',name:'Marta',networkUserId:'marta',permissions:{sosAlerts:false},role:'guardian_pro'}],{guardians:[{userId:'marta',linkId:'out',displayName:'Marta'}],following:[{userId:'marta',linkId:'in',displayName:'Marta'}]});
 assert.equal(rows.length,1);assert.equal(rows[0].id,'contact');assert.equal(rows[0].receives,true);assert.equal(rows[0].protects,true);assert.equal(rows[0].permissions.sosAlerts,false);assert.equal(rows[0].role,'guardian_pro');
});
test('an external Guardian and incoming-only W Guardian remain distinct',()=>{
 const rows=safetyPeople([{id:'external',name:'External'}],{following:[{userId:'friend',linkId:'in',displayName:'Friend'}]});
 assert.equal(rows.length,2);assert.equal(rows[0].isWallaa,false);assert.equal(rows[1].receives,false);assert.equal(rows[1].protects,true);
});

test('linked profile fields complete an old cached contact without dropping its role or choices',()=>{
 const rows=safetyPeople([{id:'contact',name:'Nickname',networkUserId:'friend',email:'',phone:'',customerId:'',permissions:{liveLocation:false},role:'guardian_pro'}],{guardians:[{userId:'friend',linkId:'out',displayName:'Canonical Name',customerId:'WSB-FRIEND',email:'friend@example.invalid',phone:'+393331234567',countryCode:'+39'}]});
 assert.equal(rows.length,1);assert.equal(rows[0].name,'Nickname');assert.equal(rows[0].customerId,'WSB-FRIEND');assert.equal(rows[0].email,'friend@example.invalid');assert.equal(rows[0].phone,'+393331234567');assert.equal(rows[0].role,'guardian_pro');assert.equal(rows[0].permissions.liveLocation,false);
});

test('Guardian disconnect history and push refresh merge once without becoming an SOS or exposing a location',()=>{
 const event={id:'guard-event',type:'disconnect',createdAt:'2026-10-18T13:22:00Z',ownerName:'Waqar',title:'Pulsante di Waqar disconnesso',body:'Perdita di collegamento segnalata',alertId:'not-an-sos',location:{latitude:45,longitude:9}};
 const mapped=guardianNotificationActivity(event);assert.equal(mapped.type,'guardian-disconnect');assert.equal(mapped.alertId,null);assert.equal(mapped.location,null);
 let rows=mergeGuardianNotifications([{id:'own-device',type:'disconnect'}],[event]);rows=mergeGuardianNotifications(rows,[event]);assert.equal(rows.length,2);assert.equal(rows.filter(x=>x.id==='remote-guard-event').length,1);assert.equal(rows[0].type,'disconnect');
});
