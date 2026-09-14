import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('../src/screens/OnboardingScreen.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const network = fs.readFileSync(new URL('../src/services/network.js', import.meta.url), 'utf8');
const backend = fs.readFileSync(new URL('../../Wallaa_Backend_v4_0_17_GitHub_ROOT/server.js', import.meta.url), 'utf8');

test('registration requires password confirmation', () => {
  assert.match(screen, /confirmPassword/);
  assert.match(screen, /passwordMismatch/);
  assert.match(screen, /form\.password === form\.confirmPassword/);
});

test('registration logo remains square instead of inheriting auth content width', () => {
  assert.match(css, /\.v405-auth-screen \.v405-auth-shield\{[\s\S]*width:82px!important;[\s\S]*height:82px!important;/);
});

test('email verification is required for new accounts with resend flow', () => {
  assert.match(network, /resendWallaaVerification/);
  assert.match(backend, /email_verification_required/);
  assert.match(backend, /wallaa_email_verifications/);
  assert.match(backend, /\/api\/auth\/verify-email/);
  assert.match(backend, /\/api\/auth\/resend-verification/);
  assert.match(backend, /Verifica prima il tuo indirizzo email/);
});
