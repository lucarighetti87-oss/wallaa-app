import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('notification badge is cleared on launch and foreground',()=>{
  const swift=read('ios/App/App/AppDelegate.swift');
  assert.match(swift,/applicationIconBadgeNumber = 0/);
  const server=read('server/server.js');
  assert.match(server,/badge: statusPayload\.type === 'wallaa_safe' \? 0 : 1/);
});

test('personal guardians have authenticated cloud persistence endpoints',()=>{
  const server=read('server/server.js');
  const network=read('src/services/network.js');
  const hook=read('src/hooks/useWallaaSafe.js');
  assert.match(server,/CREATE TABLE IF NOT EXISTS wallaa_contacts/);
  assert.match(server,/app\.get\('\/api\/contacts'/);
  assert.match(server,/app\.post\('\/api\/contacts\/sync'/);
  assert.match(network,/getWallaaContacts/);
  assert.match(hook,/syncCloudContacts/);
});

test('public support identity uses wallaasafety.com',()=>{
  const config=read('src/config.js');
  const server=read('server/server.js');
  assert.match(config,/wallaasafety\.com\/privacy-policy/);
  assert.match(config,/safety@wallaasafety\.com/);
  assert.match(server,/Wallaa Safety <safety@wallaasafety\.com>/);
});

test('SOS dispatch yields visible time between real progress stages',()=>{
  const alert=read('src/services/alert.js');
  assert.match(alert,/uiBeat/);
  assert.match(alert,/onProgress\?\.\('location'\)[\s\S]*uiBeat/);
  assert.match(alert,/onProgress\?\.\('guardians'\)[\s\S]*uiBeat/);
});

test('dark theme has explicit legacy screen/card overrides',()=>{
  const css=read('src/styles.css');
  assert.match(css,/html\[data-theme="dark"\] \.contact-card/);
  assert.match(css,/html\[data-theme="dark"\] \.activity-card/);
  assert.match(css,/html\[data-theme="dark"\] \.modal-card/);
});
