import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const sentinelPath=path.join(root,'src/screens/SentinelScreen.jsx');
const homePath=path.join(root,'src/screens/HomeV4Screen.jsx');
for(const p of [sentinelPath,homePath]) if(!fs.existsSync(p)) throw new Error(`File richiesto non trovato: ${p}`);
let sentinel=fs.readFileSync(sentinelPath,'utf8');
let home=fs.readFileSync(homePath,'utf8');
if(!sentinel.includes('Sentinel')) throw new Error('SentinelScreen non riconosciuto.');
if(sentinel.includes('WALLAA_V4_0_60_SENTINEL_ROLE_FIX')){console.log('✓ Hotfix app v4.0.60 già applicata.');process.exit(0);}

// Standard users are allowed to enter Sentinel to apply/serve.
// Remove the old hard Pro lock from SentinelScreen, while keeping `isPro` available for customer-only UI if used elsewhere.
sentinel=sentinel.replace(/\n\s*if\(!isPro\) return <section className="sentinel-page">[\s\S]*?<\/section>;\n\n\s*if\(!enabled\)/m,'\n\n  // WALLAA_V4_0_60_SENTINEL_ROLE_FIX: Basic/Standard users may serve as Sentinel.\n  if(!enabled)');

// If the screen contains a Pro-only explanatory sentence for candidate access, replace it with role semantics.
sentinel=sentinel.replace(/Sentinel è incluso in Wallaa Pro\. Passa a Pro per vedere i Sentinel vicini, candidarti e ricevere richieste di assistenza\./g,
  'Qualsiasi utente Wallaa può candidarsi come Sentinel. Wallaa Pro è richiesto solo per usare la rete Sentinel come servizio di protezione personale.');

// Home: remove wrapping plan gate around the Sentinel card if present.
// v4.0.54+ pattern: {profile?.plan === 'pro' && <button ...>...</button>}
home=home.replace(/\{profile\?\.plan === 'pro' && (<button type="button" className="w37-holo-card w37-sentinel-card-home"[\s\S]*?<\/button>)\}/m,'$1');
// Make the label explain the role for non-Pro users without hiding the entry.
home=home.replace(/<strong>Sentinel\s*<em className="w454-pro-chip">PRO<\/em><\/strong>/g,
  `<strong>Sentinel {profile?.plan === 'pro' ? <em className="w454-pro-chip">PRO</em> : null}</strong>`);
home=home.replace(/<small>Vedi e raggiungi la rete Sentinel vicina<\/small>/g,
  `<small>{profile?.plan === 'pro' ? 'Rete Sentinel e protezione Pro' : 'Candidati e aiuta la rete Wallaa'}</small>`);

fs.copyFileSync(sentinelPath,sentinelPath+'.v4.0.59.bak');
fs.writeFileSync(sentinelPath,sentinel);
fs.writeFileSync(homePath,home);

for(const rel of ['package.json','package-lock.json']){const p=path.join(root,rel);if(!fs.existsSync(p))continue;try{const j=JSON.parse(fs.readFileSync(p,'utf8'));j.version='4.0.60';if(j.packages?.[''])j.packages[''].version='4.0.60';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');}catch{}}
const project=path.join(root,'ios/App/App.xcodeproj/project.pbxproj');if(fs.existsSync(project)){let p=fs.readFileSync(project,'utf8');p=p.replace(/MARKETING_VERSION = [^;]+;/g,'MARKETING_VERSION = 4.0.60;').replace(/CURRENT_PROJECT_VERSION = \d+;/g,'CURRENT_PROJECT_VERSION = 63;');fs.writeFileSync(project,p);}
const patchNative=path.join(root,'scripts/patch-native.mjs');if(fs.existsSync(patchNative)){let p=fs.readFileSync(patchNative,'utf8');p=p.replace(/MARKETING_VERSION = 4\.0\.\d+;/g,'MARKETING_VERSION = 4.0.60;').replace(/CURRENT_PROJECT_VERSION = \d+;/g,'CURRENT_PROJECT_VERSION = 63;');fs.writeFileSync(patchNative,p);}
fs.writeFileSync(path.join(root,'RELEASE_4_0_60.md'),`# Wallaa 4.0.60 — build 63\n\n- Corretto accesso Sentinel per utenti Standard/Basic.\n- Qualsiasi utente Wallaa può entrare nella sezione Sentinel, candidarsi, essere verificato e rendersi disponibile.\n- Wallaa Pro resta necessario soltanto per usare Sentinel come servizio cliente: visualizzazione reale della rete in Posizione Live e copertura Sentinel durante SOS.\n- La card Sentinel resta visibile anche agli utenti non Pro con CTA orientata alla candidatura.\n- Mantiene QR Guardian reciproco, Notification Center persistente, logo Sentinel ufficiale e privacy distanza della v4.0.59.\n`);
console.log('✓ Wallaa App v4.0.60 hotfix applicata.');
console.log('✓ Basic/Standard può diventare Sentinel; Pro resta il piano cliente per la protezione Sentinel.');
