import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBTHomeServiceData } from '../src/services/bthome.js';

test('decodifica press Wallaa Button BTHome', () => {
  // 0x44 = BTHome v2 trigger based, non encrypted
  const data = new Uint8Array([0x44, 0x00, 0x2A, 0x01, 0x63, 0x3A, 0x01]);
  const parsed = parseBTHomeServiceData(data);
  assert.equal(parsed.packetId, 0x2A);
  assert.equal(parsed.battery, 99);
  assert.equal(parsed.button, 'press');
});

test('decodifica double_press', () => {
  const data = new Uint8Array([0x44, 0x3A, 0x02]);
  assert.equal(parseBTHomeServiceData(data).button, 'double_press');
});

test('riconosce payload criptato', () => {
  const data = new Uint8Array([0x41, 0x3A, 0x01]);
  assert.equal(parseBTHomeServiceData(data).encrypted, true);
});
