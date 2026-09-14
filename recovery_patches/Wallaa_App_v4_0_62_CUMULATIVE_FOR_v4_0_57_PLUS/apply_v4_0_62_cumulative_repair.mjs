import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.cwd();
const hookPath=path.join(root,'src/hooks/useWallaaSafe.js');
const livePath=path.join(root,'src/services/liveAlert.js');
const incomingPath=path.join(root,'src/components/IncomingAlert.jsx');
const cssPath=path.join(root,'src/styles.css');
const pkgPath=path.join(root,'package.json');
for(const p of [hookPath,livePath,incomingPath,cssPath]) if(!fs.existsSync(p)) throw new Error(`File richiesto non trovato: ${p}`);
if(fs.readFileSync(incomingPath,'utf8').includes('wallaa-sos-v462')){console.log('✓ App v4.0.62 già applicata.');process.exit(0);}

// If the current project is still 4.0.57, first carry it safely through the existing 4.0.61 cumulative repair.
let mapPath=path.join(root,'src/screens/MapScreen.jsx');
let map=fs.existsSync(mapPath)?fs.readFileSync(mapPath,'utf8'):'';
if(!map.includes('WALLAA_V4_0_61_SENTINEL_VISIBILITY_FIX')){
  const helper=path.join(path.dirname(new URL(import.meta.url).pathname),'apply_v4_0_61_cumulative_repair.mjs');
  if(fs.existsSync(helper)){
    const r=spawnSync(process.execPath,[helper],{cwd:root,stdio:'inherit'});
    if(r.status!==0) throw new Error('Repair cumulativo fino alla 4.0.61 non riuscito.');
  } else console.warn('⚠ Marker 4.0.61 non trovato; applico comunque la sola 4.0.62 sui file presenti.');
}

// Backups after the prerequisite repair.
for(const p of [hookPath,livePath,incomingPath,cssPath]) fs.copyFileSync(p,p+'.before-v4.0.62.bak');

// New service call: foreground, authenticated, permission-authorized snapshot only.
let live=fs.readFileSync(livePath,'utf8');
if(!live.includes('sendAuthorizedLocationSnapshot')){
  const anchor='export function sendLiveProtectionLocation(identity, location, battery = null) {';
  const pos=live.indexOf(anchor); if(pos<0) throw new Error('Servizio liveAlert non riconosciuto.');
  const fn=`export function sendAuthorizedLocationSnapshot(identity, location, battery = null) {\n  return request('/api/account/location-snapshot', { identity, body: { location, battery } });\n}\n\n`;
  live=live.slice(0,pos)+fn+live.slice(pos);
  fs.writeFileSync(livePath,live);
}

// Hook: send one last-known location at login/foreground and refresh every 2 minutes while the app is open.
let hook=fs.readFileSync(hookPath,'utf8');
hook=hook.replace('updateLiveLocation, sendLiveProtectionLocation }', 'updateLiveLocation, sendLiveProtectionLocation, sendAuthorizedLocationSnapshot }');
if(!hook.includes('WALLAA_V4_0_62_AUTHORIZED_LOCATION_SNAPSHOT')){
  const anchor='  // Keep a Guardian\'s incoming SOS position live while the app is open.';
  const pos=hook.indexOf(anchor); if(pos<0) throw new Error('Punto hook per location snapshot non trovato.');
  const effect=`  // WALLAA_V4_0_62_AUTHORIZED_LOCATION_SNAPSHOT\n  // Last-known foreground snapshot for the safety Admin. This does not enable background Live Protection.\n  useEffect(() => {\n    if (!loaded || !networkIdentity?.authToken || profile?.sosLocationEnabled === false) return undefined;\n    let stopped=false;\n    const publish=async()=>{\n      if(stopped || document.visibilityState==='hidden') return;\n      try {\n        const location=await getCurrentLocation();\n        if(stopped) return;\n        setCurrentLocation(location);\n        await sendAuthorizedLocationSnapshot(networkIdentityRef.current,location,telemetryRef.current?.battery??null);\n      } catch { /* permission denied/unavailable: Admin will correctly show no authorized position */ }\n    };\n    publish();\n    const timer=setInterval(publish,120000);\n    const visible=()=>{if(document.visibilityState==='visible')publish();};\n    document.addEventListener('visibilitychange',visible);\n    return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',visible);};\n  }, [loaded, networkIdentity?.authToken, profile?.sosLocationEnabled]);\n\n`;
  hook=hook.slice(0,pos)+effect+hook.slice(pos);
  fs.writeFileSync(hookPath,hook);
}

// Replace the old fake Guardian map with the live Wallaa screen.
const templatePath=path.join(path.dirname(new URL(import.meta.url).pathname),'IncomingAlert.v4.0.62.jsx');
if(!fs.existsSync(templatePath)) throw new Error('Template IncomingAlert v4.0.62 non trovato.');
fs.writeFileSync(incomingPath,fs.readFileSync(templatePath,'utf8'));

let css=fs.readFileSync(cssPath,'utf8');
const cssBlock=`\n/* WALLAA 4.0.62 — Guardian SOS live, dark Wallaa design */\n.wallaa-sos-v462{background:radial-gradient(circle at 50% 20%,rgba(0,135,210,.15),transparent 38%),rgba(0,7,16,.94)!important;backdrop-filter:blur(12px)!important;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)!important;place-items:stretch!important}\n.wallaa-sos-card{width:100%!important;max-width:none!important;min-height:100dvh!important;max-height:100dvh!important;border-radius:0!important;padding:18px 18px 16px!important;background:linear-gradient(180deg,#041221 0%,#020914 100%)!important;color:#eefaff!important;text-align:left!important;box-shadow:none!important;overflow:auto!important}\n.wallaa-sos-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.wallaa-sos-brand{display:flex;align-items:center;gap:10px}.wallaa-sos-brand>span{width:39px;height:39px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(145deg,#0d9bda,#095487);box-shadow:0 0 26px rgba(29,206,255,.17);font-size:20px;font-weight:950}.wallaa-sos-brand strong{display:block;font-size:16px;letter-spacing:.08em}.wallaa-sos-brand small{display:block;color:#64dfff;font-size:7px;letter-spacing:.19em}.wallaa-sos-card .incoming-close{position:static!important;background:#0a1c2d!important;color:#99b7cc!important;border:1px solid rgba(66,213,255,.14)!important}\n.wallaa-sos-status{display:grid;grid-template-columns:54px 1fr;gap:13px;align-items:center;margin:6px 0 14px}.wallaa-sos-icon{width:54px;height:54px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(145deg,#ff2443,#a90021);box-shadow:0 0 32px rgba(255,27,64,.24)}.wallaa-sos-status small{display:flex;align-items:center;gap:6px;color:#ff5370;font-size:9px;font-weight:950;letter-spacing:.14em}.wallaa-sos-status h2{margin:3px 0 0!important;color:#fff!important;font-size:29px!important;max-width:none!important;letter-spacing:-.04em!important}.wallaa-sos-status p{margin:1px 0 0!important;color:#aac0d0!important;font-size:13px!important}\n.wallaa-sos-card .incoming-audible-status{max-width:none!important;margin:0 0 14px!important;min-height:45px!important;border-radius:15px!important;background:rgba(255,25,58,.09)!important;border:1px solid rgba(255,64,91,.27)!important;color:#ff5b74!important;font-size:10px!important}\n.wallaa-sos-map-wrap{overflow:hidden;border-radius:25px;border:1px solid rgba(54,216,255,.32);background:#061523;box-shadow:0 24px 65px rgba(0,0,0,.34),0 0 35px rgba(22,193,255,.08)}.incoming-live-map{position:relative;height:390px;overflow:hidden;background:#071420}.incoming-live-map.waiting{display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,rgba(12,126,187,.20),transparent 35%),#06111c}.incoming-live-map.waiting>div{display:grid;justify-items:center;gap:8px;color:#83dfff;text-align:center}.incoming-live-map.waiting strong{color:#fff}.incoming-live-map.waiting span{max-width:260px;color:#7993a6;font-size:10px}.incoming-tile-grid{position:absolute;width:768px;height:768px;left:50%;top:50%;display:grid;grid-template-columns:repeat(3,256px);grid-template-rows:repeat(3,256px);transform-origin:0 0}.incoming-tile-grid img{width:256px;height:256px;filter:brightness(.38) saturate(.65) contrast(1.45) hue-rotate(165deg)}.incoming-map-vignette{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,transparent 0 30%,rgba(0,6,14,.45) 82%),linear-gradient(180deg,rgba(0,99,155,.08),rgba(0,9,17,.18));pointer-events:none}.incoming-accuracy{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(74,222,255,.45);background:rgba(27,185,255,.09);box-shadow:0 0 20px rgba(34,206,255,.10)}.incoming-live-pin{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:50px;height:50px;border-radius:50% 50% 50% 12px;rotate:-45deg;background:#08a7e8;color:#fff;display:grid;place-items:center;box-shadow:0 0 0 10px rgba(33,207,255,.14),0 0 35px #08b8f4}.incoming-live-pin i{position:absolute;inset:-16px;border:1px solid rgba(57,222,255,.45);border-radius:50%;animation:v462PinPulse 1.7s ease-out infinite}.incoming-live-pin svg{rotate:45deg}@keyframes v462PinPulse{0%{transform:scale(.6);opacity:.8}100%{transform:scale(1.5);opacity:0}}.incoming-live-badge{position:absolute;left:14px;top:14px;padding:7px 10px;border-radius:999px;background:rgba(1,14,25,.84);border:1px solid rgba(49,221,255,.36);color:#53edbf;font-size:9px;font-weight:950;letter-spacing:.11em}.incoming-live-badge i{display:inline-block;width:7px;height:7px;margin-right:5px;border-radius:50%;background:#35efae;box-shadow:0 0 10px #35efae}\n.wallaa-sos-map-meta{padding:14px 15px 15px;display:flex;justify-content:space-between;gap:12px;align-items:end}.wallaa-sos-map-meta small{display:block;color:#3bd9ff!important;font-size:7px!important;font-weight:900;letter-spacing:.12em}.wallaa-sos-map-meta strong{display:block;margin-top:4px;color:#f5fbff!important;font-size:13px!important}.wallaa-sos-map-meta>span{color:#8099aa!important;font-size:8px!important;text-align:right}.wallaa-sos-help{margin:12px 2px!important;color:#90aabc!important;font-size:10px!important;line-height:1.5!important}.wallaa-sos-card .incoming-action-grid{grid-template-columns:1fr 1fr!important;gap:10px!important}.wallaa-sos-card .incoming-call-cta,.wallaa-sos-card .incoming-map-cta{min-height:58px!important;border-radius:19px!important;font-size:11px!important}.wallaa-sos-card .incoming-call-cta{background:linear-gradient(145deg,#10263a,#071421)!important;border:1px solid rgba(110,174,215,.18)!important}.wallaa-sos-card .incoming-map-cta{background:linear-gradient(145deg,#078ecb,#06568e)!important;border:1px solid rgba(59,217,255,.27)!important}.wallaa-sos-card .incoming-dismiss{color:#70ddff!important;font-size:10px!important;padding:16px 0 8px!important}.wallaa-sos-card .incoming-disclaimer{color:#61798a!important;font-size:7px!important;text-align:center!important}\n@media(max-width:390px){.incoming-live-map{height:330px}.wallaa-sos-status h2{font-size:25px!important}.wallaa-sos-card .incoming-action-grid{grid-template-columns:1fr!important}}\n`;
if(!css.includes('WALLAA 4.0.62 — Guardian SOS live')) css+=cssBlock;
fs.writeFileSync(cssPath,css);
if(fs.existsSync(pkgPath)){try{const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));pkg.version='4.0.62';fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n')}catch{}}
fs.writeFileSync(path.join(root,'RELEASE_4_0_62.md'),`# Wallaa App 4.0.62 — build 65\n\n- Guardian SOS ridisegnato nello standard visuale Wallaa scuro/cyan.\n- Rimossa la falsa immagine mappa. La posizione reale è visibile direttamente nello stesso alert.\n- Aggiornamento posizione automatico ogni ~3 secondi tramite il polling Guardian già esistente.\n- Pulsanti Chiama e Apri in Mappe restano azioni aggiuntive, non necessarie per vedere la posizione.\n- L'app invia una posizione snapshot autorizzata mentre è aperta, per la console Admin; nessun tracking background viene attivato.\n- Mantiene le correzioni Sentinel fino alla 4.0.61.\n`);
console.log('✓ Wallaa App v4.0.62 build 65 applicata.');
console.log('✓ SOS Guardian con mappa reale inline + snapshot posizione autorizzata.');
