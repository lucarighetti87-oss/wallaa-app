import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const mapPath=path.join(root,'src/screens/MapScreen.jsx');
const homePath=path.join(root,'src/screens/HomeV4Screen.jsx');
const sentinelPath=path.join(root,'src/screens/SentinelScreen.jsx');
for(const p of [mapPath,homePath,sentinelPath]) if(!fs.existsSync(p)) throw new Error(`File richiesto non trovato: ${p}`);
let map=fs.readFileSync(mapPath,'utf8');
let home=fs.readFileSync(homePath,'utf8');
let sentinel=fs.readFileSync(sentinelPath,'utf8');
if(!sentinel.includes('WALLAA_V4_0_60_SENTINEL_ROLE_FIX') && !fs.existsSync(path.join(root,'RELEASE_4_0_60.md'))) throw new Error('Prima applica la hotfix app v4.0.60.');
if(map.includes('WALLAA_V4_0_61_SENTINEL_VISIBILITY_FIX')){console.log('✓ Hotfix app v4.0.61 già applicata.');process.exit(0);}

// Standard/Basic can SEE the Sentinel network. Pro remains required only for Sentinel dispatch as a protected customer.
map='// WALLAA_V4_0_61_SENTINEL_VISIBILITY_FIX\n'+map;
map=map.replace(/if \(!isPro \|\| !networkIdentity\?\.authToken \|\| !valid\) \{ setSentinels\(\[\]\); return undefined; \}/g,
  "if (!networkIdentity?.authToken || !valid) { setSentinels([]); return undefined; }");
map=map.replace(/\}, \[isPro,networkIdentity\?\.authToken,lat,lng,valid\]\);/g,
  '}, [networkIdentity?.authToken,lat,lng,valid]);');
map=map.replace(/\{isPro && <div className="v454-sentinel-overlay">/g,
  '{<div className="v454-sentinel-overlay">');
// close the JSX wrapper changed above: replace the exact ending of the overlay if still double-wrapped.
map=map.replace(/<\/div>\}\n\s*<div className="v402-location-details">/g,'</div>}\n        <div className="v402-location-details">');
// If the overlay had a plan-only hint, remove it.
map=map.replace(/Wallaa Pro[^<]*Sentinel/gi,'Rete Sentinel');

// Home subtitle: Standard can view the network and volunteer; Pro adds active protection.
home=home.replace(/<small>\{profile\?\.plan === 'pro' \? 'Rete Sentinel e protezione Pro' : 'Candidati e aiuta la rete Wallaa'\}<\/small>/g,
  `<small>{profile?.plan === 'pro' ? 'Rete Sentinel + protezione SOS Pro' : 'Vedi la rete e candidati come Sentinel'}</small>`);

// Sentinel screen language: Standard may browse visibility, but coverage activation belongs to Pro.
sentinel=sentinel.replace(/Wallaa Pro è richiesto solo per usare la rete Sentinel come servizio di protezione personale\./g,
  'Tutti gli utenti Wallaa possono vedere la rete e candidarsi come Sentinel. Wallaa Pro abilita la chiamata automatica della rete Sentinel durante un SOS.');

fs.copyFileSync(mapPath,mapPath+'.v4.0.60.bak');
fs.writeFileSync(mapPath,map); fs.writeFileSync(homePath,home); fs.writeFileSync(sentinelPath,sentinel);

const suppliedAsset=path.join(path.dirname(new URL(import.meta.url).pathname),'sentinel-shield.png');
if(!fs.existsSync(suppliedAsset)) throw new Error('sentinel-shield.png non trovato accanto allo script.');
fs.copyFileSync(suppliedAsset,path.join(root,'public/sentinel-shield.png'));

for(const rel of ['package.json','package-lock.json']){const p=path.join(root,rel);if(!fs.existsSync(p))continue;try{const j=JSON.parse(fs.readFileSync(p,'utf8'));j.version='4.0.61';if(j.packages?.[''])j.packages[''].version='4.0.61';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');}catch{}}
const project=path.join(root,'ios/App/App.xcodeproj/project.pbxproj');if(fs.existsSync(project)){let p=fs.readFileSync(project,'utf8');p=p.replace(/MARKETING_VERSION = [^;]+;/g,'MARKETING_VERSION = 4.0.61;').replace(/CURRENT_PROJECT_VERSION = \d+;/g,'CURRENT_PROJECT_VERSION = 64;');fs.writeFileSync(project,p);}
const patchNative=path.join(root,'scripts/patch-native.mjs');if(fs.existsSync(patchNative)){let p=fs.readFileSync(patchNative,'utf8');p=p.replace(/MARKETING_VERSION = 4\.0\.\d+;/g,'MARKETING_VERSION = 4.0.61;').replace(/CURRENT_PROJECT_VERSION = \d+;/g,'CURRENT_PROJECT_VERSION = 64;');fs.writeFileSync(patchNative,p);}
fs.writeFileSync(path.join(root,'RELEASE_4_0_61.md'),`# Wallaa 4.0.61 — build 64\n\n- Standard/Basic vede la rete Sentinel in Posizione Live esattamente come Pro.\n- Standard/Basic può candidarsi, essere verificato e operare come Sentinel.\n- Wallaa Pro resta necessario solo per attivare automaticamente la rete Sentinel quando il cliente lancia un SOS.\n- Distanza Sentinel resta protetta fuori da un SOS attivo.\n- Marker Sentinel usa esattamente lo stemma ufficiale fornito, con pulse rosso.\n`);
console.log('✓ Wallaa App v4.0.61 hotfix applicata.');
console.log('✓ Standard vede Sentinel; solo Pro attiva il dispatch Sentinel dal proprio SOS.');
