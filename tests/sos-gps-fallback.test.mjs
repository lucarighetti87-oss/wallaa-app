import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
let source=fs.readFileSync(new URL('../src/services/alert.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export async function','async function').replace(/const uiBeat = .*;/,'const uiBeat = () => Promise.resolve();');
function fixture(getCurrentLocation,reply,cached=null){let calls=[];const ctx=vm.createContext({CONFIG:{apiUrl:'https://test.invalid'},getCurrentLocation,getCachedLocation:()=>cached,setTimeout,clearTimeout,Number,JSON,fetch:async(url,options)=>{calls.push(JSON.parse(options.body));return{ok:true,json:async()=>reply};}});vm.runInContext(source,ctx);return{send:ctx.sendWallaaAlert,calls};}
const args={profile:{name:'Owner'},contacts:[{email:'guardian@example.invalid'}],trigger:'press',networkIdentity:{installationId:'test',authToken:'test'},locationEnabled:true};
test('GPS denied does not prevent SOS, and server network estimate remains marked approximate',async()=>{
 const f=fixture(async()=>{throw Error('denied');},{alertId:'test',location:{latitude:45,longitude:9,source:'wallaa_network',approximate:true}});
 const reply=await f.send(args);assert.equal(f.calls.length,1);assert.equal(f.calls[0].location,null);assert.equal(reply.location.source,'wallaa_network');assert.equal(reply.location.approximate,true);
});
test('turning off SOS location never requests GPS and explicitly sends the privacy choice',async()=>{
 let fixes=0;const f=fixture(async()=>{fixes++;return{};},{alertId:'test'});
 await f.send({...args,locationEnabled:false});assert.equal(fixes,0);assert.equal(f.calls[0].locationEnabled,false);
});
test('a stalled GPS cannot hold the SOS longer than the location deadline',async()=>{
 const f=fixture(()=>new Promise(()=>{}),{alertId:'test'});const started=Date.now();await f.send(args);assert.ok(Date.now()-started<2500);assert.equal(f.calls.length,1);
});

test('a fresh cached fix sends SOS without starting another GPS request',async()=>{let fixes=0;const location={latitude:45,longitude:9,capturedAt:new Date().toISOString()};const f=fixture(async()=>{fixes++;return location;},{alertId:'test'},location);await f.send(args);assert.equal(fixes,0);assert.equal(f.calls[0].location.latitude,45);});
