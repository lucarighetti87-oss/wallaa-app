import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hook = readFileSync(new URL('../src/hooks/useWallaaSafe.js', import.meta.url), 'utf8');
const home = readFileSync(new URL('../src/screens/HomeV4Screen.jsx', import.meta.url), 'utf8');
const device = readFileSync(new URL('../src/screens/DeviceScreen.jsx', import.meta.url), 'utf8');
const patch = readFileSync(new URL('../scripts/patch-native.mjs', import.meta.url), 'utf8');

test('event-only Wallaa Button stays ready/standby instead of false disconnected', () => {
  assert.match(hook, /monitorMode:\s*'event-only'/);
  assert.match(hook, /return 'standby'/);
  assert.match(home, /v409\.home\.readyTitle/);
  assert.match(home, /v409\.home\.standbyBody/);
});

test('Connection Guard does not infer disconnect from silence on event-only button', () => {
  assert.match(hook, /!eventOnlyButton && device\?\.id && connectionGuard\.enabled/);
  assert.match(device, /v409\.guard\.unavailableBody/);
});

test('Auto appearance follows system changes and refreshes when app returns', () => {
  assert.match(hook, /matchMedia\?\.\('\(prefers-color-scheme: dark\)'\)/);
  assert.match(hook, /addEventListener\?\.\('change', apply\)/);
  assert.match(hook, /visibilitychange/);
  assert.match(hook, /pageshow/);
});

test('native patch keeps App Store 1.0 build 19 after cap sync', () => {
  assert.match(patch, /CURRENT_PROJECT_VERSION = 19/);
  assert.match(patch, /MARKETING_VERSION = 1\.0/);
});
