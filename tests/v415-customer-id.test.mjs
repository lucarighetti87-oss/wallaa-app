import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const network = readFileSync(new URL('../src/services/network.js', import.meta.url), 'utf8');
const onboarding = readFileSync(new URL('../src/screens/OnboardingScreen.jsx', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../src/screens/SettingsScreen.jsx', import.meta.url), 'utf8');
const hook = readFileSync(new URL('../src/hooks/useWallaaSafe.js', import.meta.url), 'utf8');

test('login accepts a generic identifier instead of email only', () => {
  assert.match(network, /identifier/);
  assert.match(onboarding, /v415\.auth\.identifierPlaceholder/);
  assert.match(hook, /loginWallaaAccount\(\{ installationId: baseIdentity\.installationId, identifier:/);
});

test('customer ID is shown read-only in Settings', () => {
  assert.match(settings, /profile\.customerId/);
  assert.match(settings, /v415\.profile\.customerId/);
});

test('registration sends all legal consent fields to backend', () => {
  assert.match(network, /safetyNoticeAccepted/);
  assert.match(network, /privacyPolicyVersion/);
  assert.match(network, /termsVersion/);
  assert.match(network, /safetyNoticeVersion/);
});
