import test from 'node:test';import assert from 'node:assert/strict';import {pollSentinelMembership} from '../src/services/sentinelHeartbeat.mjs';
test('ordinary accounts discover their role without any GPS request',async()=>{
 let requests=0;const result=await pollSentinelMembership({identity:{},native:false,send:async()=>({ignored:true}),locate:async()=>{requests++;}});
 assert.equal(result.ignored,true);assert.equal(requests,0);
});
test('native Sentinel uses its background service and never duplicates GPS in JavaScript',async()=>{
 let requests=0;await pollSentinelMembership({identity:{},native:true,send:async()=>({status:'available'}),locate:async()=>{requests++;}});assert.equal(requests,0);
});
test('offline Sentinel never starts location and an available browser Sentinel requests it only when missing',async()=>{
 let requests=0,sends=0;const locate=async()=>{requests++;return {capturedAt:'real-fix-time'};};
 await pollSentinelMembership({identity:{},native:false,send:async()=>({status:'offline'}),locate});assert.equal(requests,0);
 await pollSentinelMembership({identity:{},native:false,send:async()=>{sends++;return {status:'available'};},locate});assert.equal(requests,1);assert.equal(sends,2);
 await pollSentinelMembership({identity:{},native:false,cached:{capturedAt:'cached-real-time'},send:async()=>({status:'available'}),locate});assert.equal(requests,1);
});
