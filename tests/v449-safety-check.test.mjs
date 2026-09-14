import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('src/App.jsx','utf8');
const home = fs.readFileSync('src/screens/HomeV4Screen.jsx','utf8');
const check = fs.readFileSync('src/screens/SecurityCheckScreen.jsx','utf8');
const top = fs.readFileSync('src/components/V4TopBar.jsx','utf8');
const device = fs.readFileSync('src/screens/DeviceScreen.jsx','utf8');
const active = fs.readFileSync('src/screens/ActiveAlertScreen.jsx','utf8');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const pbx = fs.readFileSync('ios/App/App.xcodeproj/project.pbxproj','utf8');

test('safety control opens diagnostics and does not fire a test alert', () => {
  assert.match(home, /onSafetyCheck/);
  assert.doesNotMatch(home, /onClick=\{onTest\}/);
  assert.match(app, /screen === 'security-check'/);
  assert.match(check, /Nessun SOS viene inviato/);
  assert.match(check, /onRefreshSystemHealth/);
});

test('diagnostics covers core app state and has back-to-home', () => {
  for (const label of ['App Wallaa','Servizi Wallaa','Notifiche','Posizione','Wallaa Button','Safety Network']) assert.match(check, new RegExp(label));
  assert.match(check, /Torna alla Home/);
});

test('Wallaa crest navigates home where wordmark is present', () => {
  assert.match(top, /onHome/);
  assert.match(top, /aa-wordmark-home/);
  assert.match(device, /onHome/);
  assert.match(active, /onHome/);
  assert.match(app, /onHome=\{\(\) => setScreen\('home'\)\}/);
});

test('version is 4.0.49 build 52', () => {
  assert.equal(pkg.version, '4.0.49');
  assert.match(pbx, /MARKETING_VERSION = 4\.0\.49;/);
  assert.match(pbx, /CURRENT_PROJECT_VERSION = 52;/);
});
