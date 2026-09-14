import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const swift = fs.readFileSync('ios/App/App/AppDelegate.swift', 'utf8');
const hook = fs.readFileSync('src/hooks/useWallaaSafe.js', 'utf8');
const patch = fs.readFileSync('scripts/patch-native.mjs', 'utf8');
const pbx = fs.readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('4.0.45 starts native live tracking as soon as active SOS Preferences change', () => {
  assert.match(swift, /UserDefaults\.didChangeNotification/);
  assert.match(swift, /refreshLiveTrackingFromDefaults\(\)/);
  assert.match(swift, /startUpdatingLocation\(\)/);
});

test('4.0.45 publishes Guardian live coordinates on a 2 second cadence', () => {
  assert.match(swift, /timeIntervalSince\(liveLastSentAt\) < 2/);
  assert.match(hook, /now - lastPublishedAt < 2000/);
  assert.match(swift, /\[WALLAA\]\[LIVE\] uploaded/);
});

test('4.0.45 build metadata survives cap sync', () => {
  assert.equal(pkg.version, '4.0.45');
  assert.match(pbx, /CURRENT_PROJECT_VERSION = 48;/);
  assert.match(pbx, /MARKETING_VERSION = 4\.0\.45;/);
  assert.match(patch, /CURRENT_PROJECT_VERSION = 48;/);
  assert.match(patch, /MARKETING_VERSION = 4\.0\.45;/);
});
