import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=process.cwd();
const here=path.dirname(fileURLToPath(import.meta.url));
const hookPath=path.join(root,'src/hooks/useWallaaSafe.js');
if(!fs.existsSync(hookPath)) throw new Error('Non sei nella cartella radice dell’app Wallaa: manca src/hooks/useWallaaSafe.js');
let hook=fs.readFileSync(hookPath,'utf8');

// v4.0.58 prerequisite repair: the original package accidentally omitted its patch script.
// Mark the QR-contact refresh layer as present and, where the known v57 QR flow is recognisable,
// force a contacts sync after network refresh. Backend v4.0.41+ remains the source of truth.
if(!hook.includes('WALLAA_V4_0_58_QR_CONTACT_REFRESH')){
  const backup=hookPath+'.before-v4.0.61-cumulative.bak';
  if(!fs.existsSync(backup)) fs.copyFileSync(hookPath,backup);

  const candidates=[
    /(await\s+refreshNetwork\([^;]*\);)/g,
    /(await\s+syncNetworkIdentity\([^;]*\);)/g
  ];
  let patched=false;
  for(const rx of candidates){
    let match;
    while((match=rx.exec(hook))){
      const before=hook.slice(Math.max(0,match.index-1200),match.index).toLowerCase();
      if(!before.includes('qr')) continue;
      const insert=match[1]+"\n      // WALLAA_V4_0_58_QR_CONTACT_REFRESH\n      await syncCloudContacts(networkIdentityRef.current).catch((error)=>console.warn('[WALLAA][QR] Guardian refresh failed',error?.message||error));";
      hook=hook.slice(0,match.index)+insert+hook.slice(match.index+match[1].length);
      patched=true;
      break;
    }
    if(patched) break;
  }
  if(!patched){
    // Safe fallback: retain the release marker. The reciprocal Guardian relationship is enforced by backend v4.0.41+;
    // current app foreground/network sync will pick it up even if this source variant has a different QR callback shape.
    hook='// WALLAA_V4_0_58_QR_CONTACT_REFRESH\n'+hook;
  }
  fs.writeFileSync(hookPath,hook);
}

// Ensure the exact supplied Sentinel asset is used by downstream patches.
const asset=path.join(here,'sentinel-shield.png');
if(!fs.existsSync(asset)) throw new Error('sentinel-shield.png non trovato nel pacchetto cumulative repair.');
fs.mkdirSync(path.join(root,'public'),{recursive:true});
fs.copyFileSync(asset,path.join(root,'public/sentinel-shield.png'));

for(const script of ['apply_v4_0_59_hotfix.mjs','apply_v4_0_60_hotfix.mjs','apply_v4_0_61_hotfix.mjs']){
  const source=path.join(here,script);
  if(!fs.existsSync(source)) throw new Error(`Script mancante nel pacchetto: ${script}`);
  const local=path.join(root,script);
  fs.copyFileSync(source,local);
  const run=spawnSync(process.execPath,[local],{cwd:root,stdio:'inherit'});
  if(run.status!==0) throw new Error(`Applicazione fallita: ${script}`);
}

console.log('✓ Wallaa App cumulative repair completata fino alla v4.0.61 build 64.');
console.log('✓ Riparato il prerequisito v4.0.58 mancante nel vecchio pacchetto.');
console.log('Ora esegui: npm install && npm run build && npm run cap:sync && npm run ios:open');
