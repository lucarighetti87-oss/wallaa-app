import {recentSentinelFix,updateSentinelAvailability} from '../src/services/sentinelActivation.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {pollSentinelMembership} from '../src/services/sentinelHeartbeat.mjs';
test('ordinary accounts discover their role without any GPS request',async()=>{
 let requests=0;const result=await pollSentinelMembership({identity:{},native:false,send:async()=>({ignored:true}),locate:async()=>{requests++;}});
 assert.equal(result.ignored,true);assert.equal(requests,0);
});
test('visible native Sentinel recovers a missing fix after membership discovery',async()=>{
 let requests=0;await pollSentinelMembership({identity:{},native:true,send:async()=>({status:'available'}),locate:async()=>{requests++;}});assert.equal(requests,1);
});
test('offline Sentinel never starts location and an available browser Sentinel requests it only when missing',async()=>{
 let requests=0,sends=0;const locate=async()=>{requests++;return {capturedAt:'real-fix-time'};};
 await pollSentinelMembership({identity:{},native:false,send:async()=>({status:'offline'}),locate});assert.equal(requests,0);
 await pollSentinelMembership({identity:{},native:false,send:async()=>{sends++;return {status:'available'};},locate});assert.equal(requests,1);assert.equal(sends,2);
 await pollSentinelMembership({identity:{},native:false,cached:{capturedAt:'cached-real-time'},send:async()=>({status:'available'}),locate});assert.equal(requests,1);
});

test('activation publishes a fresh fix instead of the old location still displayed by the screen',async()=>{
 const events=[],fix={latitude:45,longitude:9,capturedAt:new Date().toISOString()};
 await updateSentinelAvailability({available:true,cached:{...fix,capturedAt:new Date(Date.now()-600000).toISOString()},setAvailability:async value=>events.push(['available',value]),saveNative:async value=>events.push(['native',value.available]),locate:async()=>{events.push(['locate']);return fix;},publish:async value=>events.push(['publish',value])});
 assert.deepEqual(events.map(x=>x[0]),['available','native','locate','publish']);assert.equal(events[3][1],fix);assert.equal(recentSentinelFix({}),false);
});
test('switching off performs no GPS request, and a fresh cache avoids an extra GPS request',async()=>{
 let locations=0,published=0;const options={setAvailability:async()=>{},saveNative:async()=>{},locate:async()=>{locations++;},publish:async()=>published++};
 await updateSentinelAvailability({...options,available:false});assert.equal(locations,0);assert.equal(published,0);
 await updateSentinelAvailability({...options,available:true,cached:{capturedAt:new Date().toISOString()}});assert.equal(locations,0);assert.equal(published,1);
});
test('GPS failure does not silently undo the Sentinel activation and never publishes a stale fix',async()=>{
 let saved,published=false;await assert.rejects(updateSentinelAvailability({available:true,setAvailability:async()=>{},saveNative:async value=>saved=value,locate:async()=>({capturedAt:new Date(Date.now()-600000).toISOString()}),publish:async()=>published=true}),/posizione/);assert.equal(saved.available,true);assert.equal(published,false);
});
