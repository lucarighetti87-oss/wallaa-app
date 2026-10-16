import test from 'node:test';import assert from 'node:assert/strict';
import {confirmedNativeLoss,nativeLossEscalation} from '../src/services/disconnectPolicy.mjs';
const start=Date.parse('2026-10-17T06:00:00Z');
const loss=(seconds,overrides={})=>({disconnectedAt:new Date(start).toISOString(),disconnectCheckedAt:new Date(start+seconds*1000).toISOString(),disconnectConfirmed:true,connected:false,ready:false,...overrides});
test('live SOS link rejects stale advertising and stale disconnect timestamps',()=>{
 assert.equal(confirmedNativeLoss(loss(700,{connected:true,ready:true}),start+700000),false);
 assert.equal(confirmedNativeLoss(loss(700,{ready:true}),start+700000),false);
 assert.equal(confirmedNativeLoss(loss(700),start+720000),false);
});
test('first check and temporary interruptions never notify',()=>{
 assert.equal(confirmedNativeLoss(loss(1),start+1000,30),false);
 assert.equal(confirmedNativeLoss(loss(70,{disconnectConfirmed:false}),start+70000),false);
 assert.equal(confirmedNativeLoss(loss(59),start+59000),false);
 assert.equal(confirmedNativeLoss(loss(60),start+60000),true);
});
test('Guardian escalation waits until after all three five-minute reminders',()=>{
 for(const delay of [30,60,300]){
  for(const second of [delay,delay+300,delay+600])assert.equal(nativeLossEscalation(loss(second),start+second*1000,delay),false);
  assert.equal(nativeLossEscalation(loss(delay+601),start+(delay+601)*1000,delay),true);
  assert.equal(nativeLossEscalation(loss(delay+601,{connected:true}),start+(delay+601)*1000,delay),false);
 }
});
