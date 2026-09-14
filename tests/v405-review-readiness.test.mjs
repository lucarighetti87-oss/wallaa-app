import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('v4.0.5 frontend does not embed the legacy shared API key', () => {
  const files = ['src/config.js','src/services/alert.js','src/services/network.js','src/services/liveAlert.js','src/services/system.js'];
  for (const file of files) assert.equal(read(file).includes('VITE_ALERT_API_KEY'), false, file);
});

test('SOS API requires an authenticated Wallaa identity', () => {
  const server = read('server/server.js');
  const route = server.slice(server.indexOf("app.post('/api/alert'"), server.indexOf("// --- WALLAA v4 LIVE ALERT"));
  assert.match(route, /const networkUser = await requireNetworkUser\(req\)/);
});

test('iOS public target is iPhone portrait only', () => {
  const project = read('ios/App/App.xcodeproj/project.pbxproj');
  const plist = read('ios/App/App/Info.plist');
  assert.equal(project.includes('TARGETED_DEVICE_FAMILY = "1,2";'), false);
  assert.match(project, /TARGETED_DEVICE_FAMILY = 1;/);
  assert.equal(plist.includes('UIInterfaceOrientationLandscapeLeft'), false);
  assert.equal(plist.includes('UIInterfaceOrientationLandscapeRight'), false);
});
