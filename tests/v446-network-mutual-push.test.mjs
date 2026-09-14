import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const hook = fs.readFileSync(new URL('../src/hooks/useWallaaSafe.js', import.meta.url), 'utf8');
const pbx = fs.readFileSync(new URL('../ios/App/App.xcodeproj/project.pbxproj', import.meta.url), 'utf8');
const patchNative = fs.readFileSync(new URL('../scripts/patch-native.mjs', import.meta.url), 'utf8');

test('successful QR scan exits network flow to Home', () => {
  assert.match(app, /await safe\.scanNetworkQr\(\); setScreen\('home'\)/);
});

test('network relationships refresh while app is visible', () => {
  assert.match(hook, /setInterval\(tick, 8000\)/);
  assert.match(hook, /toast\.qrConnectedBilateral/);
});

test('release is 4.0.46 build 49', () => {
  assert.match(pbx, /MARKETING_VERSION = 4\.0\.46;/);
  assert.match(pbx, /CURRENT_PROJECT_VERSION = 49;/);
  assert.match(patchNative, /CURRENT_PROJECT_VERSION = 49;/);
  assert.match(patchNative, /MARKETING_VERSION = 4\.0\.46;/);
});
