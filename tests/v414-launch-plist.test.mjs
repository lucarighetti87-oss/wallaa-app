import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const plist = fs.readFileSync(new URL('../ios/App/App/Info.plist', import.meta.url), 'utf8');
const patch = fs.readFileSync(new URL('../scripts/patch-native.mjs', import.meta.url), 'utf8');
const project = fs.readFileSync(new URL('../ios/App/App.xcodeproj/project.pbxproj', import.meta.url), 'utf8');

test('export compliance key occurs exactly once in generated Info.plist', () => {
  const count = (plist.match(/<key>ITSAppUsesNonExemptEncryption<\/key>/g) || []).length;
  assert.equal(count, 1);
});

test('export compliance key is after scene manifest closes, not nested in scene dictionaries', () => {
  const sceneStart = plist.indexOf('<key>UIApplicationSceneManifest</key>');
  const exportKey = plist.indexOf('<key>ITSAppUsesNonExemptEncryption</key>');
  assert.ok(sceneStart >= 0);
  assert.ok(exportKey >= 0);
  const sceneEnd = plist.indexOf('</dict>', plist.indexOf('<key>UISceneConfigurations</key>', sceneStart));
  assert.ok(sceneEnd > sceneStart);
  const scenePrefix = plist.slice(sceneStart, exportKey);
  assert.equal((scenePrefix.match(/ITSAppUsesNonExemptEncryption/g) || []).length, 0);
});

test('native patch removes stray export keys before adding the top-level key', () => {
  assert.match(patch, /plist\.replace\(\/\\s\*<key>ITSAppUsesNonExemptEncryption/);
  assert.match(patch, /ensurePlistKey\(plist, 'ITSAppUsesNonExemptEncryption'/);
});

test('App Store build is version 1.0 build 19', () => {
  assert.match(project, /MARKETING_VERSION = 1\.0;/);
  assert.match(project, /CURRENT_PROJECT_VERSION = 19;/);
});
