import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const saved=new Map();let callback;
globalThis.__mokoTest={
 Capacitor:{isNativePlatform:()=>true},
 Preferences:{async get({key}){return{value:saved.get(key)||null};},async set({key,value}){saved.set(key,value);}},
 BleClient:{async initialize(){},async stopLEScan(){},async requestLEScan(options,cb){assert.ok(options.services.some(x=>x.includes('fee0')));callback=cb;}}
};
let source=fs.readFileSync(new URL('../src/services/ble.js',import.meta.url),'utf8');
source=source.replace(/^import .*;\n/gm,'');
source=`const {Preferences,Capacitor,BleClient}=globalThis.__mokoTest;\nconst BTHOME_UUID='0000fcd2-0000-1000-8000-00805f9b34fb';\nimport {MOKO_SERVICE_UUIDS,findMokoData,parseMokoAlarm,parseMokoDeviceInfo,mokoCounterKey,consumeMokoFrame} from '${new URL('../src/services/mokoButton.js',import.meta.url)}';\nimport {findBTHomeData,parseBTHomeServiceData} from '${new URL('../src/services/bthome.js',import.meta.url)}';\n`+source;
const ble=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function advertisement(count,status=3){const info=new Uint8Array(21);info[14]=100;info.set([0x78,0x50,5,0,0x9f,0x8b],15);return{device:{deviceId:'test-peripheral'},localName:'MK Button',serviceData:{fee0:Uint8Array.from([0x20,status,count>>8,count&255,0,0,1,0,0]),ea00:info}};}
const tick=()=>new Promise(r=>setTimeout(r,30));
test('pair, suppress pairing broadcasts, emit one new press and preserve full counters across restart',async()=>{
 const pending=ble.pairWallaaButton();await tick();await callback(advertisement(1));const device=await pending;
 assert.equal(device.hardwareId,'MOKO:785005009F8B');assert.equal(device.protocol,'moko-button');
 let events=[];
 await ble.startWallaaMonitor({deviceId:device.id,hardwareId:device.hardwareId,onEvent:e=>events.push(e),onError:e=>{throw e;}});
 callback(advertisement(1));callback(advertisement(2));callback(advertisement(2));await tick();
 assert.equal(events.length,1);assert.equal(events[0].event,'press');
 await ble.stopBleScan();
 await ble.startWallaaMonitor({deviceId:device.id,hardwareId:device.hardwareId,onEvent:e=>events.push(e)});
 callback(advertisement(2));callback(advertisement(3,1));callback(advertisement(3));callback(advertisement(4));await tick();
 assert.equal(events.length,3);assert.equal(events[1].packetId,3);assert.equal(events[2].packetId,4);
 await ble.stopBleScan();
});
test('a volunteer without a paired button reports a foreign tag only after participation is enabled',async()=>{
 let observations=[],events=[];
 await ble.startWallaaMonitor({deviceId:'another-peripheral',communityEnabled:false,onCommunityObservation:x=>observations.push(x),onEvent:x=>events.push(x)});
 callback({...advertisement(0,1),rssi:-64});await tick();assert.equal(observations.length,0);
 await ble.stopBleScan();
 await ble.startWallaaMonitor({communityEnabled:true,onCommunityObservation:x=>observations.push(x),onEvent:x=>events.push(x)});
 callback({...advertisement(0,1),rssi:-64});await tick();assert.equal(observations.length,1);assert.equal(observations[0].hardwareId,'MOKO:785005009F8B');assert.equal(events.length,0);
 await ble.stopBleScan();
});
