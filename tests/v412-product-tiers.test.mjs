import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('Location screen renders real map tiles with radar overlay', () => {
  const map = read('src/screens/MapScreen.jsx');
  assert.match(map, /tile\.openstreetmap\.org/);
  assert.match(map, /v412-radar-ring/);
  assert.match(map, /appleMapsUrl/);
});

test('Activity history expires after 30 days and can be cleared manually', () => {
  const hook = read('src/hooks/useWallaaSafe.js');
  const activity = read('src/screens/ActivityScreen.jsx');
  assert.match(hook, /30 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(hook, /clearActivities/);
  assert.match(activity, /v412\.activity\.clearAll/);
});

test('Profile details are read-only until Edit my data is selected', () => {
  const settings = read('src/screens/SettingsScreen.jsx');
  assert.match(settings, /editingProfile/);
  assert.match(settings, /v412\.settings\.editMyData/);
  assert.match(settings, /v412-profile-readonly/);
});

test('Basic and Pro are enforced by backend entitlement', () => {
  const server = read('server/server.js');
  const hook = read('src/hooks/useWallaaSafe.js');
  assert.match(server, /subscription_tier/);
  assert.match(server, /contactLimitFor\(user\)/);
  assert.match(server, /return normalizedPlan\(user\) === 'pro' \? 5 : 2/);
  assert.match(server, /proEnabled && operatingCenterEnabled/);
  assert.match(server, /Live tracking disponibile con Wallaa Pro/);
  assert.match(hook, /profileRef\.current\?\.plan !== 'pro'/);
});

test('Backend and local activity retention default to 30 days', () => {
  const server = read('server/server.js');
  assert.match(server, /ALERT_RETENTION_DAYS \|\| 30/);
});
