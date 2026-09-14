import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync(new URL('../server/server.js', import.meta.url), 'utf8');
const onboarding = fs.readFileSync(new URL('../src/screens/OnboardingScreen.jsx', import.meta.url), 'utf8');
const patchNative = fs.readFileSync(new URL('../scripts/patch-native.mjs', import.meta.url), 'utf8');
const env = fs.readFileSync(new URL('../.env.production.example', import.meta.url), 'utf8');

test('v4.0.18 separates user account from installation identity', () => {
  assert.match(server, /ALTER TABLE wallaa_users ALTER COLUMN installation_id DROP NOT NULL/);
  assert.match(server, /DROP CONSTRAINT IF EXISTS wallaa_users_installation_id_key/);
  assert.match(server, /INSERT INTO wallaa_users[\s\S]*VALUES \(\$1,\$2,NULL,/);
  assert.match(server, /CREATE TABLE IF NOT EXISTS wallaa_installations/);
  assert.match(server, /ON CONFLICT \(installation_id\) DO UPDATE SET user_id=EXCLUDED.user_id/);
});

test('pending duplicate registration is recoverable and raw SQL conflicts are hidden', () => {
  assert.match(server, /pendingVerification:true,[\s\S]*alreadyExists:true/);
  assert.match(server, /verificationEmailSent/);
  assert.match(server, /Registration database conflict/);
  assert.match(server, /Non è stato possibile completare la registrazione/);
  assert.match(onboarding, /v418\.auth\.accountCreatedEmailPending/);
  assert.match(onboarding, /v418\.auth\.accountPendingResent/);
});

test('build 19 and wallaasafety API are the defaults', () => {
  assert.match(patchNative, /CURRENT_PROJECT_VERSION = 19/);
  assert.match(env, /VITE_API_BASE_URL=https:\/\/api\.wallaasafety\.com/);
  assert.doesNotMatch(env, /api\.wallaa\.it/);
});
