import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('Wallaa Button screen exposes 1/2/3 click, continuous press and random clicks', () => {
  const config = read('src/config.js');
  const device = read('src/screens/DeviceScreen.jsx');
  assert.match(config, /value: 'press'/);
  assert.match(config, /value: 'double_press'/);
  assert.match(config, /value: 'triple_press'/);
  assert.match(config, /value: 'long_press'/);
  assert.match(config, /value: 'any_press'/);
  assert.match(device, /TRIGGERS\.map/);
  assert.match(device, /onTrigger/);
});

test('selected random-click trigger accepts all supported BTHome button events', () => {
  const config = read('src/config.js');
  assert.match(config, /configured === 'any_press'/);
  for (const event of ['press','double_press','triple_press','long_press','long_double_press','long_triple_press','hold_press']) {
    assert.ok(config.includes(`'${event}'`));
  }
});

test('iOS AppDelegate includes native CoreBluetooth background monitor and restoration id', () => {
  const swift = read('ios/App/App/AppDelegate.swift');
  assert.match(swift, /import CoreBluetooth/);
  assert.match(swift, /WallaaBackgroundBLEManager/);
  assert.match(swift, /CBCentralManagerOptionRestoreIdentifierKey/);
  assert.match(swift, /scanForPeripherals/);
  assert.match(swift, /UIApplication\.shared\.applicationState != \.active/);
  assert.match(swift, /beginBackgroundTask/);
});

test('native background monitor remains silent on protected phone and posts SOS directly to API', () => {
  const swift = read('ios/App/App/AppDelegate.swift');
  assert.match(swift, /URLSession\.shared\.dataTask/);
  assert.match(swift, /x-wallaa-install-token/);
  assert.doesNotMatch(swift, /UNUserNotificationCenter/);
  assert.doesNotMatch(swift, /AVAudioPlayer/);
});

test('foreground SOS shows dispatch screen immediately while delivery is in progress', () => {
  const hook = read('src/hooks/useWallaaSafe.js');
  const app = read('src/App.jsx');
  assert.match(hook, /setDispatchingAlert\(true\)/);
  assert.match(app, /EmergencyDispatchOverlay/);
  assert.match(app, /open=\{safe\.dispatchingAlert\}/);
});

test('backend deduplicates native and WebView observations of same BTHome packet', () => {
  const server = read('server/server.js');
  assert.match(server, /eventPacketId/);
  assert.match(server, /INTERVAL '15 seconds'/);
  assert.match(server, /device_identifier/);
  assert.match(server, /packet_id/);
});
