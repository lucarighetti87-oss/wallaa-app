import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('SOS sender remains silent while guardian incoming alert starts siren', () => {
  const hook = read('src/hooks/useWallaaSafe.js');
  const fireStart = hook.indexOf('const fireAlert = useCallback');
  const fireEnd = hook.indexOf('const closeActiveAlert', fireStart);
  const fireRoute = hook.slice(fireStart, fireEnd);
  assert.equal(fireRoute.includes('playWallaaAlarm'), false, 'sender SOS path must not play guardian siren');
  assert.match(hook, /onAlert:\s*\(alert\)\s*=>\s*\{[\s\S]*?playWallaaAlarm\(\)/);
});

test('guardian siren is bundled and used for APNs SOS', () => {
  const server = read('server/server.js');
  const project = read('ios/App/App.xcodeproj/project.pbxproj');
  assert.match(server, /sound:\s*'wallaa-guardian-siren\.wav'/);
  assert.match(project, /wallaa-guardian-siren\.wav in Resources/);
  const wav = fs.statSync(new URL('../public/wallaa-guardian-siren.wav', import.meta.url));
  assert.ok(wav.size > 100000, 'custom siren file should be non-trivial');
});

test('QR-linked guardians with SOS permission receive APNs push', () => {
  const server = read('server/server.js');
  const route = server.slice(server.indexOf("app.post('/api/alert'"), server.indexOf('// --- WALLAA v4 LIVE ALERT'));
  assert.match(route, /JOIN wallaa_push_devices d ON d\.user_id=l\.guardian_user_id/);
  assert.match(route, /l\.sos_alerts=TRUE/);
  assert.match(route, /await sendApns\(row\.push_token/);
});

test('foreground guardian alert renders full-screen acknowledgement UI', () => {
  const push = read('src/services/push.js');
  const incoming = read('src/components/IncomingAlert.jsx');
  const config = read('capacitor.config.json');
  assert.match(push, /pushNotificationReceived/);
  assert.match(incoming, /role="alertdialog"/);
  assert.match(incoming, /stopWallaaAlarm/);
  assert.match(config, /"sound"/);
  assert.match(config, /"alert"/);
});

test('emergency email uses table-based transactional layout', () => {
  const server = read('server/server.js');
  const build = server.slice(server.indexOf('function buildHtml(payload, contact)'), server.indexOf('function buildText(payload, contact)'));
  assert.match(build, /role="presentation"/);
  assert.match(build, /cid:wallaa-logo/);
  assert.match(build, /copy\.safetyLabel/);
  assert.match(build, /copy\.notReplacement/);
});
