import fs from 'node:fs';
const checks = [
  ['package.json', '"version": "4.0.68"'],
  ['src/services/sentinel.js', 'normalizeNearbyPayload'],
  ['src/services/sentinel.js', 'distance_m'],
  ['src/screens/MapScreen.jsx', 'positione protetta'.replace('positione','posizione')],
  ['src/screens/MapScreen.jsx', "setInterval(load,10000)"],
  ['src/hooks/useWallaaSafe.js', 'setInterval(ping,30000)'],
  ['src/hooks/useWallaaSafe.js', 'Legacy 45s Sentinel presence loop removed'],
  ['RELEASE_4_0_68.md', 'Sentinel Reliability & Privacy']
];
let failed = false;
for (const [file, needle] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  const ok = text.includes(needle);
  console.log(`${ok ? 'OK' : 'FAIL'} ${file} :: ${needle}`);
  if (!ok) failed = true;
}
const pbx = fs.readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');
for (const needle of ['MARKETING_VERSION = 4.0.68;', 'CURRENT_PROJECT_VERSION = 71;']) {
  const ok = pbx.includes(needle);
  console.log(`${ok ? 'OK' : 'FAIL'} Xcode :: ${needle}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
