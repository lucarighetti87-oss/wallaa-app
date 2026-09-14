import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const livePath=path.join(root,'src/services/liveAlert.js');
const hookPath=path.join(root,'src/hooks/useWallaaSafe.js');
const pkgPath=path.join(root,'package.json');
for(const p of [livePath,hookPath]) if(!fs.existsSync(p)) throw new Error('File app Wallaa non trovato: '+p);
let live=fs.readFileSync(livePath,'utf8'),hook=fs.readFileSync(hookPath,'utf8');
if(hook.includes('WALLAA_V4_0_65_RELIABLE_SENTINEL_HEARTBEAT')){console.log('✓ App v4.0.65 già applicata.');process.exit(0);}
fs.copyFileSync(livePath,livePath+'.before-v4.0.65.bak');fs.copyFileSync(hookPath,hookPath+'.before-v4.0.65.bak');

if(!live.includes('sendUniversalSentinelHeartbeat')){
  const anchor='export function updateLiveLocation'; const pos=live.indexOf(anchor); if(pos<0) throw new Error('liveAlert.js non riconosciuto.');
  const fn=`export function sendUniversalSentinelHeartbeat(identity, location = null) {\n  return request('/api/sentinel/heartbeat', { identity, body: location ? { location } : {} });\n}\n\n`;
  live=live.slice(0,pos)+fn+live.slice(pos);fs.writeFileSync(livePath,live);
}
const rx=/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/services\/liveAlert['"];?/m;const m=hook.match(rx);if(!m) throw new Error('Import liveAlert non trovato.');
let names=m[1].split(',').map(x=>x.trim()).filter(Boolean);if(!names.includes('sendUniversalSentinelHeartbeat'))names.push('sendUniversalSentinelHeartbeat');hook=hook.replace(rx,`import { ${names.join(', ')} } from '../services/liveAlert';`);

const effect=`  // WALLAA_V4_0_65_RELIABLE_SENTINEL_HEARTBEAT\n  // Heartbeat universale: il backend decide se questo account è una Sentinel attiva.\n  // Non dipende dalla pagina Sentinel o da un GET preliminare: riduce i punti di guasto.\n  useEffect(() => {\n    if (!loaded || !networkIdentity?.authToken) return undefined;\n    let stopped=false; let running=false;\n    const ping=async()=>{\n      if(stopped||running) return; running=true;\n      try {\n        let location=null;\n        try { location=await getCurrentLocation(); if(!stopped&&location) setCurrentLocation(location); } catch {}\n        if(!stopped) await sendUniversalSentinelHeartbeat(networkIdentityRef.current,location);\n      } catch(error) { console.warn('[WALLAA][SENTINEL] heartbeat',error?.message||error); }\n      finally { running=false; }\n    };\n    ping();\n    const timer=setInterval(ping,30000);\n    const wake=()=>ping();\n    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')wake();});\n    window.addEventListener('focus',wake);\n    window.addEventListener('online',wake);\n    return()=>{stopped=true;clearInterval(timer);window.removeEventListener('focus',wake);window.removeEventListener('online',wake);};\n  }, [loaded, networkIdentity?.authToken]);\n\n`;
let pos=hook.indexOf('  // WALLAA_V4_0_63_SENTINEL_HEARTBEAT');
if(pos<0) pos=hook.indexOf('  // WALLAA_V4_0_62_AUTHORIZED_LOCATION_SNAPSHOT');
if(pos<0) pos=hook.indexOf("  // Keep a Guardian's incoming SOS position live while the app is open.");
if(pos<0) throw new Error('Punto effect heartbeat non trovato.');
hook=hook.slice(0,pos)+effect+hook.slice(pos);fs.writeFileSync(hookPath,hook);

for(const rel of ['package.json','package-lock.json']){const p=path.join(root,rel);if(!fs.existsSync(p))continue;try{const j=JSON.parse(fs.readFileSync(p,'utf8'));j.version='4.0.65';if(j.packages?.[''])j.packages[''].version='4.0.65';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');}catch{}}
const project=path.join(root,'ios/App/App.xcodeproj/project.pbxproj');if(fs.existsSync(project)){let p=fs.readFileSync(project,'utf8');p=p.replace(/MARKETING_VERSION = [^;]+;/g,'MARKETING_VERSION = 4.0.65;').replace(/CURRENT_PROJECT_VERSION = \d+;/g,'CURRENT_PROJECT_VERSION = 68;');fs.writeFileSync(project,p);}
const patchNative=path.join(root,'scripts/patch-native.mjs');if(fs.existsSync(patchNative)){let p=fs.readFileSync(patchNative,'utf8');p=p.replace(/MARKETING_VERSION = 4\.0\.\d+;/g,'MARKETING_VERSION = 4.0.65;').replace(/CURRENT_PROJECT_VERSION = \d+;/g,'CURRENT_PROJECT_VERSION = 68;');fs.writeFileSync(patchNative,p);}
fs.writeFileSync(path.join(root,'RELEASE_4_0_65.md'),`# Wallaa App 4.0.65 — build 68\n\n- Heartbeat Sentinel ogni 30 secondi mentre l'app è attiva.\n- Ping immediato all'avvio, ritorno in foreground, rete ripristinata e focus.\n- Non dipende più dal GET Sentinel/me: il backend ignora automaticamente gli account non-Sentinel.\n- Se il GPS è disponibile, ogni heartbeat include la posizione.\n- Su iOS sospeso in background non viene promesso un timer continuo: lo stato ONLINE scade correttamente se il sistema sospende l'app.\n`);
console.log('✓ Wallaa App v4.0.65 build 68 applicata.');
