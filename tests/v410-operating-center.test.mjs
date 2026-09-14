import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync(new URL('../server/server.js', import.meta.url), 'utf8');
const contacts = fs.readFileSync(new URL('../src/screens/ContactsScreen.jsx', import.meta.url), 'utf8');
const hook = fs.readFileSync(new URL('../src/hooks/useWallaaSafe.js', import.meta.url), 'utf8');

test('Wallaa Operating Center remains configured but is gated to Pro', () => {
  assert.match(server, /OPERATING_CENTER_EMAIL/);
  assert.match(server, /safety@wallaasafety\.com/);
  assert.match(server, /system_center/);
  assert.match(server, /proEnabled && operatingCenterEnabled/);
});

test('no-guardian condition is user friendly', () => {
  assert.match(server, /NO_GUARDIANS/);
  assert.match(hook, /noPersonalGuardians/);
  assert.match(hook, /v410\.toast\.noGuardiansCenterSent/);
});

test('invalid APNs tokens are disabled instead of surfaced repeatedly', () => {
  assert.match(server, /BadDeviceToken/);
  assert.match(server, /enabled=FALSE/);
});

test('Operating Center UI is shown as Pro-only when account is Basic', () => {
  assert.match(contacts, /v410-operating-center/);
  assert.match(contacts, /safety@wallaasafety\.com/);
  assert.match(contacts, /isPro/);
  assert.match(contacts, /v412-center|v412\.center\.basicBody/);
});
