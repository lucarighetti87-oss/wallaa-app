import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const topbar = fs.readFileSync(new URL('../src/components/V4TopBar.jsx', import.meta.url), 'utf8');
const drawer = fs.readFileSync(new URL('../src/components/SideMenu.jsx', import.meta.url), 'utf8');
const notifications = fs.readFileSync(new URL('../src/screens/NotificationsScreen.jsx', import.meta.url), 'utf8');

test('iOS home topbar restores a safe-area-aware touch region', () => {
  assert.match(css, /--w38-safe-top:max\(env\(safe-area-inset-top\), 52px\)/);
  assert.match(css, /screen-home \.aa-topbar-v36[\s\S]*padding:var\(--w38-safe-top\)/);
  assert.match(topbar, /aa-menu-trigger/);
  assert.match(topbar, /type="button"/);
});

test('drawer remains a fixed viewport overlay above app content', () => {
  assert.match(css, /app-shell-v4 > \.side-menu-backdrop[\s\S]*position:fixed!important/);
  assert.match(css, /side-menu-backdrop[\s\S]*z-index:1000!important/);
  assert.match(drawer, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(drawer, /role="dialog"/);
});

test('notification center owns the top safe area and responsive title layout', () => {
  assert.match(notifications, /aa-notifications-screen-v38/);
  assert.match(notifications, /aa-notifications-titleblock/);
  assert.match(css, /aa-notifications-screen-v38[\s\S]*safe-area-inset-top/);
  assert.match(css, /aa-notifications-titleblock>h1[\s\S]*clamp/);
});

test('critical overlays are restored to fixed stacking after generic child rules', () => {
  for (const cls of ['modal-backdrop','alert-result-backdrop','incoming-alert-backdrop','sos-activation-overlay','emergency-dispatch-overlay']) {
    assert.match(css, new RegExp(`app-shell-v4 > \\.${cls}`));
  }
});
