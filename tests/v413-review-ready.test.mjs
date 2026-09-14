import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const patch = readFileSync(new URL('../scripts/patch-native.mjs', import.meta.url), 'utf8');
const plist = readFileSync(new URL('../ios/App/App/Info.plist', import.meta.url), 'utf8');

test('launch splash transitions from red radar to green ready state', () => {
  assert.match(app, /splash-radar/);
  assert.match(css, /border-color:#ff283d/);
  assert.match(css, /border-color:#20d67e/);
  assert.match(app, /1450/);
});

test('App Store export compliance is declared as exempt', () => {
  assert.match(plist, /<key>ITSAppUsesNonExemptEncryption<\/key>[\s\S]*?<false\/>/);
  assert.match(patch, /ITSAppUsesNonExemptEncryption/);
  assert.match(patch, /ensurePlistKey/);
});
