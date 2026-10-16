import test from 'node:test';import assert from 'node:assert/strict';import {combineReceiverStatus,receiverErrorText,receiverLocationUsable,receiverReportItems} from '../src/services/networkReceiver.js';
test('a native failure newer than the last sent report remains visible',()=>{const result=combineReceiverStatus({lastReportAt:'2026-10-08T12:00:00Z'},{lastFailureAt:'2026-10-08T12:01:00Z',lastStatusCode:403});assert.equal(result.error,'HTTP 403');assert.equal(result.paused,false);});
test('a later report clears an older native failure',()=>{const result=combineReceiverStatus({lastReportAt:'2026-10-08T12:02:00Z'},{lastFailureAt:'2026-10-08T12:01:00Z',lastStatusCode:403});assert.equal(result.error,'');});
test('an empty receiver never claims a successful detection or report',()=>{const result=combineReceiverStatus();assert.equal(result.lastDetectedAt,null);assert.equal(result.lastReportAt,null);assert.equal(result.error,'');});

test('a local failure preserves the real cause when no native failure exists',()=>{
 const result=combineReceiverStatus({lastFailureAt:'2026-10-17T01:00:00Z',error:'Posizione del ricevitore non recente.'},{});
 assert.equal(result.error,'Posizione del ricevitore non recente.');
});

test('receiver diagnoses server and position failures without inventing denied permissions',()=>{
 assert.match(receiverErrorText('HTTP 503'),/servizio Wallaa/);
 assert.match(receiverErrorText('HTTP -1'),/posizione recente/);
 assert.doesNotMatch(receiverErrorText('HTTP 0'),/permessi|Internet/);
});
test('stale or inaccurate GPS and out-of-window observations are not submitted together',()=>{
 const now=Date.parse('2026-10-17T01:00:00Z'),location={capturedAt:new Date(now).toISOString(),accuracy:20};
 assert.equal(receiverLocationUsable(location,now),true);
 assert.equal(receiverLocationUsable({...location,accuracy:200},now),false);
 assert.equal(receiverLocationUsable({...location,capturedAt:new Date(now-20000).toISOString()},now),false);
 const items=[{id:'fresh',rssi:-60,observedAt:new Date(now-1000).toISOString()},{id:'old',rssi:-60,observedAt:new Date(now-20000).toISOString()}];
 assert.deepEqual(receiverReportItems(items,location,now).map(x=>x.id),['fresh']);
});
