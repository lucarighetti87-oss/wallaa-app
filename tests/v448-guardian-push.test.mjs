import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('foreground presentation options',()=>{for(const p of ['capacitor.config.json','ios/App/App/capacitor.config.json']){const d=JSON.parse(read(p));assert.deepEqual(d.plugins.PushNotifications.presentationOptions,['badge','sound','banner','list']);}});
test('foreground SOS audible fallback',()=>{const s=read('src/services/push.js');assert.match(s,/received foreground/);assert.match(s,/playWallaaAlarm\(\{ loop: true \}\)/);assert.match(s,/local guardian fallback/);});
test('siren bundled + native diagnostics',()=>{assert.match(read('ios/App/App.xcodeproj/project.pbxproj'),/wallaa-guardian-siren\.wav in Resources/);assert.match(read('ios/App/App/AppDelegate.swift'),/guardian siren bundled=/);});
test('version build',()=>{assert.equal(JSON.parse(read('package.json')).version,'4.0.48');const p=read('ios/App/App.xcodeproj/project.pbxproj');assert.match(p,/CURRENT_PROJECT_VERSION = 51;/);assert.match(p,/MARKETING_VERSION = 4\.0\.48;/);});
