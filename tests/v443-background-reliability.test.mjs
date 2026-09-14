import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('native iOS BLE monitor owns background scanning and re-arms after target discoveries', () => {
  const swift = read('ios/App/App/AppDelegate.swift');
  assert.match(swift, /enterBackgroundMode/);
  assert.match(swift, /enterForegroundMode/);
  assert.match(swift, /rearmBackgroundScan/);
  assert.match(swift, /target-discovery/);
  assert.match(swift, /scanForPeripherals\(withServices: \[serviceUUID\], options: nil\)/);
});

test('restore identifier remains stable and persisted for UIScene restoration', () => {
  const swift = read('ios/App/App/AppDelegate.swift');
  assert.match(swift, /restoreIdentifierDefaultsKey/);
  assert.match(swift, /it\.wallaa\.safebutton\.background\.central\.v407/);
  assert.match(swift, /CBCentralManagerOptionRestoreIdentifierKey/);
  assert.match(swift, /willRestoreState/);
});

test('duplicate debounce no longer suppresses legitimate repeated SOS for 12 seconds', () => {
  const swift = read('ios/App/App/AppDelegate.swift');
  assert.doesNotMatch(swift, /< 12/);
  assert.match(swift, /button\.packetId == nil \? 1\.1 : 1\.8/);
});

test('foreground JS BLE scan yields to native monitor when WebView becomes hidden', () => {
  const hook = read('src/hooks/useWallaaSafe.js');
  assert.match(hook, /appVisible/);
  assert.match(hook, /document\.visibilityState !== 'hidden'/);
  assert.match(hook, /!loaded \|\| !device\?\.id \|\| !armed \|\| !appVisible/);
});

test('native SOS retries transient HTTP failures when event packet id is available', () => {
  const swift = read('ios/App/App/AppDelegate.swift');
  assert.match(swift, /performAlertRequest/);
  assert.match(swift, /attempt < 3/);
  assert.match(swift, /button\.packetId != nil/);
  assert.match(swift, /backgroundTimeRemaining/);
});

test('required iOS background modes remain enabled', () => {
  const plist = read('ios/App/App/Info.plist');
  assert.match(plist, /<string>bluetooth-central<\/string>/);
  assert.match(plist, /<string>location<\/string>/);
  assert.match(plist, /NSBluetoothAlwaysUsageDescription/);
});
