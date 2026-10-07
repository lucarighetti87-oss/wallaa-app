import test from 'node:test';
import assert from 'node:assert/strict';
import {sentinelOfferState} from '../src/services/sentinelOfferState.js';

const now=Date.now();
const request={offerId:'example',expiresAt:new Date(now+45000).toISOString()};
test('a pushed request cannot be accepted before the server verifies it',()=>{
 const result=sentinelOfferState(request,now);assert.equal(result.available,false);assert.equal(result.checking,true);
});
test('a verified request has a visible response deadline',()=>{
 const result=sentinelOfferState({...request,actionable:true},now);assert.equal(result.available,true);assert.equal(result.remainingSeconds,45);
});
test('expiry disables answering but preserves an explanation and the original snapshot',()=>{
 const snapshot={...request,actionable:true};
 const result=sentinelOfferState(snapshot,now+46000);assert.equal(result.available,false);assert.match(result.message,/terminato/);assert.equal(snapshot.offerId,'example');
});
test('closure and assignment to another Sentinel override a locally unexpired timer',()=>{
 assert.match(sentinelOfferState({...request,actionable:false,reason:'sos_closed'},now).message,/chiuso/);
 assert.match(sentinelOfferState({...request,actionable:false,reason:'assigned'},now).message,/altra Sentinel/);
});
