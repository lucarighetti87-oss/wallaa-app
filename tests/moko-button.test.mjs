import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMokoAlarm, parseMokoDeviceInfo, findMokoData, consumeMokoFrame } from '../src/services/mokoButton.js';
const alarm = (count, status=3, type=0x20) => Uint8Array.from([type,status,count>>8,count&255,0,0,1,0,0]);
test('MK Button distinguishes standby, single, double and long press',()=>{
 assert.equal(parseMokoAlarm(alarm(0,1)).button,null);
 assert.equal(parseMokoAlarm(alarm(1)).button,'press');
 assert.equal(parseMokoAlarm(alarm(1,3,0x21)).button,'double_press');
 assert.equal(parseMokoAlarm(alarm(1,3,0x22)).button,'long_press');
 assert.equal(parseMokoAlarm(alarm(1,3,0x23)),null);
});
test('rejects incomplete, unrelated and unsupported double-button firmware frames',()=>{
 assert.equal(parseMokoAlarm([0x20,3]),null);
 const frame=alarm(1);frame[7]=2;assert.equal(parseMokoAlarm(frame),null);
 assert.equal(parseMokoAlarm(alarm(1,3,0x24)),null);
});
test('stable MAC identity comes from EA00, never the generic 000001 device code',()=>{
 const info=new Uint8Array(21);info[14]=100;info.set([0x78,0x50,5,0,0x9f,0x8b],15);
 assert.equal(parseMokoDeviceInfo(info).hardwareId,'MOKO:785005009F8B');
 assert.equal(parseMokoDeviceInfo(info).battery,100);
 assert.equal(parseMokoDeviceInfo(new Uint8Array(21)),null);
 info[13]=0x0b;info[14]=0xb8;assert.equal(parseMokoDeviceInfo(info).battery,null);
});
test('works with plugin DataViews, Maps and expanded UUIDs',()=>{
 const raw=alarm(1),view=new DataView(raw.buffer);
 assert.equal(parseMokoAlarm(view).counter,1);
 assert.equal(findMokoData(new Map([['0000fee0-0000-1000-8000-00805f9b34fb',view]]),'fee0'),view);
 assert.equal(findMokoData({'abcdfee0':view},'fee0'),undefined);
});
test('pairing baseline and repeated triggered broadcasts do not generate SOS',()=>{
 let state={'32':1};
 for(let i=0;i<10;i++){const r=consumeMokoFrame(parseMokoAlarm(alarm(1)),state);assert.equal(r.emit,false);state=r.counters;}
 let r=consumeMokoFrame(parseMokoAlarm(alarm(2)),state);assert.equal(r.emit,true);
 assert.equal(consumeMokoFrame(parseMokoAlarm(alarm(2)),r.counters).emit,false);
});
test('restart restores counters, unknown streams baseline, standby and wrap behave correctly',()=>{
 assert.equal(consumeMokoFrame(parseMokoAlarm(alarm(5)),{}).emit,false);
 let r=consumeMokoFrame(parseMokoAlarm(alarm(65535,1)),{});assert.equal(r.emit,false);
 assert.equal(consumeMokoFrame(parseMokoAlarm(alarm(0)),JSON.parse(JSON.stringify(r.counters))).emit,true);
});

test('a standby frame preceding the alarm does not swallow the first physical click',()=>{const standby=consumeMokoFrame(parseMokoAlarm(alarm(2,1)),{'32':1});assert.equal(standby.emit,false);const triggered=consumeMokoFrame(parseMokoAlarm(alarm(2)),standby.counters);assert.equal(triggered.emit,true);assert.equal(consumeMokoFrame(parseMokoAlarm(alarm(2)),triggered.counters).emit,false);});
