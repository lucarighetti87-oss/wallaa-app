import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const hookPath=path.join(root,'src/hooks/useWallaaSafe.js');
const networkPath=path.join(root,'src/services/network.js');
const mapPath=path.join(root,'src/screens/MapScreen.jsx');
const sentinelPath=path.join(root,'src/screens/SentinelScreen.jsx');
const cssPath=path.join(root,'src/styles.css');
for(const p of [hookPath,networkPath,mapPath,sentinelPath,cssPath]) if(!fs.existsSync(p)) throw new Error(`File richiesto non trovato: ${p}`);
let hook=fs.readFileSync(hookPath,'utf8');
if(!hook.includes('WALLAA_V4_0_58_QR_CONTACT_REFRESH')) throw new Error('Prima applica la hotfix app v4.0.58.');
if(hook.includes('WALLAA_V4_0_59_CLEAR_REMOTE_NOTIFICATIONS')){console.log('✓ Hotfix app v4.0.59 già applicata.');process.exit(0);}

// 1) Server-persistent Notification Center clear.
let network=fs.readFileSync(networkPath,'utf8');
if(!network.includes('clearWallaaNotificationHistory')){
  const anchor="export async function acknowledgeActiveNetworkAlerts(identity) {";
  const pos=network.indexOf(anchor);
  if(pos<0) throw new Error('Servizio acknowledgeActiveNetworkAlerts non trovato.');
  network=network.slice(0,pos)+"export async function clearWallaaNotificationHistory(identity) {\n  return api('/api/network/notifications', { method: 'DELETE', identity });\n}\n\n"+network.slice(pos);
}
// add import symbol in the existing network import
if(!hook.includes('clearWallaaNotificationHistory')){
  hook=hook.replace('getWallaaNotificationHistory, acknowledgeActiveNetworkAlerts', 'getWallaaNotificationHistory, acknowledgeActiveNetworkAlerts, clearWallaaNotificationHistory');
  if(!hook.includes('clearWallaaNotificationHistory')) throw new Error('Import network notification functions non riconosciuto.');
}
const clearAnchor='const clearActivities = useCallback(async () => {';
let clearPos=hook.indexOf(clearAnchor);
if(clearPos<0){
  // fallback: locate callback containing setActivities([])
  const activityPos=hook.indexOf('setActivities([])');
  if(activityPos<0) throw new Error('Funzione cancellazione Attività/Notifiche non trovata.');
  clearPos=hook.lastIndexOf('const ',activityPos);
  const brace=hook.indexOf('{',clearPos);
  hook=hook.slice(0,brace+1)+"\n    // WALLAA_V4_0_59_CLEAR_REMOTE_NOTIFICATIONS\n    const identity=networkIdentityRef.current;\n    if(identity?.authToken) await clearWallaaNotificationHistory(identity).catch((error)=>console.warn('[WALLAA][NOTIFICATIONS] remote clear failed',error?.message||error));"+hook.slice(brace+1);
}else{
  const insertAt=clearPos+clearAnchor.length;
  hook=hook.slice(0,insertAt)+"\n    // WALLAA_V4_0_59_CLEAR_REMOTE_NOTIFICATIONS\n    const identity=networkIdentityRef.current;\n    if(identity?.authToken) await clearWallaaNotificationHistory(identity).catch((error)=>console.warn('[WALLAA][NOTIFICATIONS] remote clear failed',error?.message||error));"+hook.slice(insertAt);
}

// 2) Sentinel map privacy: edge markers without distance unless backend says distanceM (active SOS).
let map=fs.readFileSync(mapPath,'utf8');
const callbackStart=map.indexOf('{sentinels.slice(0,20).map((sentinel, index) => {');
if(callbackStart<0) throw new Error('Blocco marker Sentinel della mappa non riconosciuto.');
const callbackEndMarker='      })}';
const callbackEnd=map.indexOf(callbackEndMarker,callbackStart);
if(callbackEnd<0) throw new Error('Fine blocco marker Sentinel non trovata.');
const newCallback=`{sentinels.slice(0,20).map((sentinel, index) => {\n        const edgeX=155, edgeY=145;\n        const bearing=Number(sentinel.bearingDeg);\n        const forcedEdge=sentinel.edgeOnly===true && Number.isFinite(bearing);\n        let dx=0,dy=0,outOfView=forcedEdge;\n        if(forcedEdge){\n          const rad=bearing*Math.PI/180; dx=Math.sin(rad)*edgeX; dy=-Math.cos(rad)*edgeY;\n        } else {\n          const slat=Number(sentinel.latitude), slng=Number(sentinel.longitude);\n          if(!Number.isFinite(slat)||!Number.isFinite(slng)) return null;\n          const sp=tilePosition(slat,slng,16), cp=tilePosition(lat,lng,16);\n          const rawDx=(sp.x-cp.x)*256, rawDy=(sp.y-cp.y)*256;\n          const scale=Math.min(1,edgeX/Math.max(Math.abs(rawDx),1),edgeY/Math.max(Math.abs(rawDy),1));\n          outOfView=scale<1; dx=rawDx*scale; dy=rawDy*scale;\n        }\n        const distance=Number(sentinel.distanceM);\n        const canShowDistance=Number.isFinite(distance)&&distance>0;\n        const distanceText=canShowDistance?(distance<1000?\`\${Math.round(distance)} m\`:\`\${(distance/1000).toFixed(1)} km\`):'';\n        const label=sentinel.label||'Sentinel';\n        const detail=canShowDistance?\`\${label} · \${distanceText}\`:\`\${label} · distanza protetta\`;\n        return <button key={sentinel.id||index} type="button" className={\`v454-sentinel-marker \${sentinelMode?'sentinel-radar-marker':''} \${outOfView?'edge-marker':''}\`} style={{left:\`calc(50% + \${dx}px)\`,top:\`calc(50% + \${dy}px)\`}} title={detail} aria-label={detail}><img src="/sentinel-shield.png" alt="Sentinel"/><i className={\`state-\${sentinel.status||'available'}\`}/>{outOfView&&canShowDistance&&<span className="edge-distance">{distanceText}</span>}</button>;\n      })}`;
map=map.slice(0,callbackStart)+newCallback+map.slice(callbackEnd+callbackEndMarker.length);
// Hide distance in the Sentinel list when backend intentionally suppresses it.
map=map.replace(/<small>\{Number\(s\.distanceM\)<1000 \? `\$\{Math\.round\(Number\(s\.distanceM\)\)\} m` : `\$\{\(Number\(s\.distanceM\)\/1000\)\.toFixed\(1\)\} km`\} · \{s\.statusLabel \|\| 'Disponibile'\}\{Number\.isFinite\(Number\(s\.completedInterventions\)\) \? ` · \$\{s\.completedInterventions\} interventi` : ''\}\{s\.inInitialRadius === false \? ' · oltre 4 km' : ''\}<\/small>/g,
`<small>{Number.isFinite(Number(s.distanceM)) && Number(s.distanceM)>0 ? \`${'${'}Number(s.distanceM)<1000?Math.round(Number(s.distanceM))+' m':(Number(s.distanceM)/1000).toFixed(1)+' km'} · ${'${'}s.statusLabel||'Disponibile'}${'${'}Number.isFinite(Number(s.completedInterventions))?' · '+s.completedInterventions+' interventi':''}\` : \`${'${'}s.statusLabel||'Disponibile'} · distanza protetta${'${'}Number.isFinite(Number(s.completedInterventions))?' · '+s.completedInterventions+' interventi':''}\`}</small>`);

// 3) Exact official Sentinel shield asset + red pulse overlays on the static Sentinel artwork.
let sentinel=fs.readFileSync(sentinelPath,'utf8');
if(sentinel.includes('function SentinelStaticMap()')&&!sentinel.includes('sentinel-static-logo logo-a')){
  sentinel=sentinel.replace('<img className="sentinel-static-map-image" src="/sentinel-static-map.png" alt="Rete Wallaa Sentinel" />', '<img className="sentinel-static-map-image" src="/sentinel-static-map.png" alt="Rete Wallaa Sentinel" />\n      <img className="sentinel-static-logo logo-a" src="/sentinel-shield.png" alt=""/>\n      <img className="sentinel-static-logo logo-b" src="/sentinel-shield.png" alt=""/>\n      <img className="sentinel-static-logo logo-c" src="/sentinel-shield.png" alt=""/>\n      <img className="sentinel-static-logo logo-d" src="/sentinel-shield.png" alt=""/>');
}
let css=fs.readFileSync(cssPath,'utf8');
if(!css.includes('WALLAA_V4_0_59_SENTINEL_OFFICIAL_LOGO')) css+=`\n/* WALLAA_V4_0_59_SENTINEL_OFFICIAL_LOGO */\n.sentinel-static-logo{position:absolute;width:58px;height:58px;object-fit:contain;transform:translate(-50%,-50%);z-index:4;filter:drop-shadow(0 0 8px rgba(255,18,42,.9));pointer-events:none}\n.sentinel-static-logo.logo-a{left:27%;top:14%}.sentinel-static-logo.logo-b{left:77%;top:18%}.sentinel-static-logo.logo-c{left:18%;top:68%}.sentinel-static-logo.logo-d{left:82%;top:67%}\n`;

fs.copyFileSync(hookPath,hookPath+'.v4.0.58.bak');
fs.writeFileSync(hookPath,hook);fs.writeFileSync(networkPath,network);fs.writeFileSync(mapPath,map);fs.writeFileSync(sentinelPath,sentinel);fs.writeFileSync(cssPath,css);
const suppliedAsset=path.join(path.dirname(new URL(import.meta.url).pathname),'sentinel-shield.png');
if(!fs.existsSync(suppliedAsset)) throw new Error('sentinel-shield.png non trovato accanto allo script hotfix.');
fs.copyFileSync(suppliedAsset,path.join(root,'public/sentinel-shield.png'));
for(const rel of ['package.json','package-lock.json']){const p=path.join(root,rel);if(!fs.existsSync(p))continue;try{const j=JSON.parse(fs.readFileSync(p,'utf8'));j.version='4.0.59';if(j.packages?.[''])j.packages[''].version='4.0.59';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');}catch{}}
const project=path.join(root,'ios/App/App.xcodeproj/project.pbxproj');if(fs.existsSync(project)){let p=fs.readFileSync(project,'utf8');p=p.replace(/MARKETING_VERSION = [^;]+;/g,'MARKETING_VERSION = 4.0.59;').replace(/CURRENT_PROJECT_VERSION = \d+;/g,'CURRENT_PROJECT_VERSION = 62;');fs.writeFileSync(project,p);}
const patchNative=path.join(root,'scripts/patch-native.mjs');if(fs.existsSync(patchNative)){let p=fs.readFileSync(patchNative,'utf8');p=p.replace(/MARKETING_VERSION = 4\.0\.\d+;/g,'MARKETING_VERSION = 4.0.59;').replace(/CURRENT_PROJECT_VERSION = \d+;/g,'CURRENT_PROJECT_VERSION = 62;');fs.writeFileSync(patchNative,p);}
fs.writeFileSync(path.join(root,'RELEASE_4_0_59.md'),`# Wallaa 4.0.59 — build 62\n\n- Cancellazione Notification Center persistente tramite backend v4.0.42.\n- Asset Sentinel sostituito con lo stemma ufficiale fornito, mantenendo pulse rosso.\n- Privacy Sentinel: senza SOS attivo, gli scudi restano a bordo mappa ma NON mostrano distanza.\n- Senza SOS il client usa soltanto il bearing/direzione restituito dal backend; distanza e coordinate sono protette.\n- Durante SOS attivo distanza e posizione approssimata tornano visibili.\n- Mantiene QR Guardian reciproco della v4.0.58.\n`);
console.log('✓ Wallaa App v4.0.59 hotfix applicata.');
console.log('✓ Copiato stemma Sentinel ufficiale.');
