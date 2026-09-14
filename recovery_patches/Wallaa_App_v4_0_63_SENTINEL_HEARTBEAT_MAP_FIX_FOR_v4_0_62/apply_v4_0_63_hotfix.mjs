import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const livePath=path.join(root,'src/services/liveAlert.js');
const hookPath=path.join(root,'src/hooks/useWallaaSafe.js');
const mapPath=path.join(root,'src/screens/MapScreen.jsx');
const pkgPath=path.join(root,'package.json');
for(const p of [livePath,hookPath,mapPath]) if(!fs.existsSync(p)) throw new Error(`File richiesto non trovato: ${p}`);
let live=fs.readFileSync(livePath,'utf8');
let hook=fs.readFileSync(hookPath,'utf8');
let map=fs.readFileSync(mapPath,'utf8');
if(hook.includes('WALLAA_V4_0_63_SENTINEL_HEARTBEAT')){console.log('✓ App v4.0.63 già applicata.');process.exit(0);}

for(const p of [livePath,hookPath,mapPath]) fs.copyFileSync(p,p+'.before-v4.0.63.bak');

// API helpers independent from SentinelScreen: the app asks the server whether this account is currently available.
if(!live.includes('getSentinelWorkerState')){
  const anchor='export function updateLiveLocation';
  const pos=live.indexOf(anchor); if(pos<0) throw new Error('liveAlert.js non riconosciuto.');
  const helpers=`export function getSentinelWorkerState(identity) {\n  return request('/api/sentinel/me', { method: 'GET', identity });\n}\n\nexport function sendSentinelPresence(identity, location) {\n  return request('/api/sentinel/presence', { identity, body: { location } });\n}\n\n`;
  live=live.slice(0,pos)+helpers+live.slice(pos);
  fs.writeFileSync(livePath,live);
}

// Extend the existing liveAlert import robustly.
const importRx=/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/services\/liveAlert['"];?/m;
const im=hook.match(importRx);
if(!im) throw new Error('Import liveAlert non trovato in useWallaaSafe.js.');
let names=im[1].split(',').map(x=>x.trim()).filter(Boolean);
for(const n of ['getSentinelWorkerState','sendSentinelPresence']) if(!names.includes(n)) names.push(n);
hook=hook.replace(importRx,`import { ${names.join(', ')} } from '../services/liveAlert';`);

// Foreground Sentinel heartbeat. This is intentionally driven by server state so every screen behaves consistently.
const effect=`  // WALLAA_V4_0_63_SENTINEL_HEARTBEAT\n  // A verified Sentinel that has selected AVAILABLE must publish fresh GPS presence or it is not online.\n  useEffect(() => {\n    if (!loaded || !networkIdentity?.authToken) return undefined;\n    let stopped=false;\n    let running=false;\n    const heartbeat=async()=>{\n      if(stopped || running || (typeof document!=='undefined' && document.visibilityState==='hidden')) return;\n      running=true;\n      try {\n        const me=await getSentinelWorkerState(networkIdentityRef.current);\n        const s=me?.profile || me?.sentinel || me || {};\n        const status=String(s.status||'').toLowerCase();\n        const available=(s.enabled!==false) && (s.verified===true || s.verified===1 || String(s.verified).toLowerCase()==='true') && (status==='available' || s.available===true);\n        if(!available) return;\n        const location=await getCurrentLocation();\n        if(stopped) return;\n        setCurrentLocation(location);\n        await sendSentinelPresence(networkIdentityRef.current,location);\n      } catch(error) {\n        console.warn('[WALLAA][SENTINEL] heartbeat skipped',error?.message||error);\n      } finally { running=false; }\n    };\n    heartbeat();\n    const timer=setInterval(heartbeat,45000);\n    const visible=()=>{if(document.visibilityState==='visible')heartbeat();};\n    document.addEventListener('visibilitychange',visible);\n    return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',visible);};\n  }, [loaded, networkIdentity?.authToken]);\n\n`;

const preferred=[
  "  // WALLAA_V4_0_62_AUTHORIZED_LOCATION_SNAPSHOT",
  "  // Keep a Guardian's incoming SOS position live while the app is open."
];
let pos=-1; for(const a of preferred){pos=hook.indexOf(a);if(pos>=0)break;}
if(pos<0){
  // fallback before the first callback declaration after initial effects
  pos=hook.indexOf('  const ',hook.indexOf('export function useWallaaSafe'));
}
if(pos<0) throw new Error('Punto sicuro per heartbeat Sentinel non trovato.');
hook=hook.slice(0,pos)+effect+hook.slice(pos);
fs.writeFileSync(hookPath,hook);

// Force the official supplied asset again, so marker and list icon are consistent.
const asset=path.join(path.dirname(new URL(import.meta.url).pathname),'sentinel-shield.png');
if(fs.existsSync(asset)){fs.mkdirSync(path.join(root,'public'),{recursive:true});fs.copyFileSync(asset,path.join(root,'public/sentinel-shield.png'));}

// Keep privacy invariant and make the reason visible in source: map is allowed for Basic/Standard too.
if(!map.includes('WALLAA_V4_0_63_SENTINEL_MAP_ALL_USERS')) map='// WALLAA_V4_0_63_SENTINEL_MAP_ALL_USERS — nearby markers are visible to every authenticated plan; dispatch remains backend Pro-only.\n'+map;
fs.writeFileSync(mapPath,map);

for(const rel of ['package.json','package-lock.json']){const p=path.join(root,rel);if(!fs.existsSync(p))continue;try{const j=JSON.parse(fs.readFileSync(p,'utf8'));j.version='4.0.63';if(j.packages?.[''])j.packages[''].version='4.0.63';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');}catch{}}
const project=path.join(root,'ios/App/App.xcodeproj/project.pbxproj');if(fs.existsSync(project)){let p=fs.readFileSync(project,'utf8');p=p.replace(/MARKETING_VERSION = [^;]+;/g,'MARKETING_VERSION = 4.0.63;').replace(/CURRENT_PROJECT_VERSION = \d+;/g,'CURRENT_PROJECT_VERSION = 66;');fs.writeFileSync(project,p);}
const patchNative=path.join(root,'scripts/patch-native.mjs');if(fs.existsSync(patchNative)){let p=fs.readFileSync(patchNative,'utf8');p=p.replace(/MARKETING_VERSION = 4\.0\.\d+;/g,'MARKETING_VERSION = 4.0.63;').replace(/CURRENT_PROJECT_VERSION = \d+;/g,'CURRENT_PROJECT_VERSION = 66;');fs.writeFileSync(patchNative,p);}
fs.writeFileSync(path.join(root,'RELEASE_4_0_63.md'),`# Wallaa 4.0.63 — build 66\n\n- Una Sentinel AVAILABLE invia heartbeat GPS ogni 45 secondi mentre l'app è in primo piano.\n- L'heartbeat viene inviato anche appena l'app torna visibile.\n- Questo alimenta sentinel_presence e rende gli scudi visibili sulle mappe degli altri utenti.\n- Standard e Pro vedono entrambi la rete Sentinel.\n- Il backend continua a escludere la Sentinel stessa dalla propria mappa e a riservare il dispatch SOS ai Pro.\n- Asset Sentinel ufficiale confermato.\n`);
console.log('✓ Wallaa App v4.0.63 Sentinel heartbeat applicato.');
console.log('✓ Build iOS impostata a 66.');
