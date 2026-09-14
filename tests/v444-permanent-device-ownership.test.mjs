import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('4.0.44 claims a stable hardware identity before saving the device', () => {
  const ble = read('src/services/ble.js');
  const hook = read('src/hooks/useWallaaSafe.js');
  const network = read('src/services/network.js');

  assert.match(ble, /portableIdentity:\s*true/);
  assert.match(ble, /advertised-serial/);
  assert.match(hook, /claimWallaaDevice/);
  assert.match(hook, /DEVICE_IDENTITY_NOT_STABLE/);
  assert.match(network, /\/api\/devices\/claim/);
});

test('4.0.44 does not expose user-side disconnect / transfer control', () => {
  const screen = read('src/screens/DeviceScreen.jsx');
  assert.doesNotMatch(screen, /Disconnetti Wallaa Button/);
  assert.match(screen, /Associazione permanente/);
  assert.match(screen, /appartiene al tuo account/);
});

test('native background SOS carries permanent ownership credentials', () => {
  const swift = read('ios/App/App/AppDelegate.swift');
  assert.match(swift, /let hardwareId: String\?/);
  assert.match(swift, /let claimToken: String\?/);
  assert.match(swift, /"hardwareId": config\.hardwareId/);
  assert.match(swift, /"claimToken": config\.claimToken/);
});

test('release version is 4.0.44 build 47', () => {
  const pkg = JSON.parse(read('package.json'));
  const project = read('ios/App/App.xcodeproj/project.pbxproj');
  const patch = read('scripts/patch-native.mjs');
  assert.equal(pkg.version, '4.0.44');
  assert.match(project, /MARKETING_VERSION = 4\.0\.44;/);
  assert.match(project, /CURRENT_PROJECT_VERSION = 47;/);
  assert.match(patch, /MARKETING_VERSION = 4\.0\.44/);
  assert.match(patch, /CURRENT_PROJECT_VERSION = 47/);
});
