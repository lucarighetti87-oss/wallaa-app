import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const incomingPath=path.join(root,'src/components/IncomingAlert.jsx');
const pkgPath=path.join(root,'package.json');
if(!fs.existsSync(incomingPath)) throw new Error('src/components/IncomingAlert.jsx non trovato. Esegui nella root della app Wallaa.');
let src=fs.readFileSync(incomingPath,'utf8');
if(src.includes('WALLAA_V4_0_64_SOS_MAP_LAYOUT_FIX')){console.log('✓ App v4.0.64 già applicata.');process.exit(0);}
fs.copyFileSync(incomingPath,incomingPath+'.before-v4.0.64.bak');

const oldReturn="return {tiles,left:50+(p.x-cx)*256-128,top:50+(p.y-cy)*256-128};";
const newReturn="return {tiles,offsetX:256+(p.x-cx)*256,offsetY:256+(p.y-cy)*256};";
if(!src.includes(oldReturn)) throw new Error('Calcolo mappa v4.0.62 non riconosciuto. Nessuna modifica applicata.');
src=src.replace(oldReturn,newReturn);
const oldTransform="style={{transform:`translate(calc(-33.333% + ${128-(data.left-50)}px), calc(-33.333% + ${128-(data.top-50)}px))`}}";
const newTransform="style={{transform:`translate(${-data.offsetX}px, ${-data.offsetY}px)`}}";
if(!src.includes(oldTransform)) throw new Error('Trasformazione tile SOS non riconosciuta. Nessuna modifica applicata.');
src=src.replace(oldTransform,newTransform);
src='// WALLAA_V4_0_64_SOS_MAP_LAYOUT_FIX — centra sempre il mosaico OSM sul fix GPS, senza area vuota laterale.\n'+src;
fs.writeFileSync(incomingPath,src);

// CSS hardening: 3x3 tile mosaic starts at the viewport centre and is translated by the exact world-pixel offset.
const styleCandidates=['src/styles.css','src/index.css','src/App.css'];
let cssPath=styleCandidates.map(x=>path.join(root,x)).find(fs.existsSync);
if(cssPath){
  let css=fs.readFileSync(cssPath,'utf8');
  fs.copyFileSync(cssPath,cssPath+'.before-v4.0.64.bak');
  if(!css.includes('WALLAA_V4_0_64_MAP_CSS')){
    css += `\n/* WALLAA_V4_0_64_MAP_CSS */\n.wallaa-sos-card .incoming-live-map{position:relative!important;overflow:hidden!important;background:#071420!important}\n.wallaa-sos-card .incoming-tile-grid{position:absolute!important;left:50%!important;top:50%!important;width:768px!important;height:768px!important;display:grid!important;grid-template-columns:repeat(3,256px)!important;grid-template-rows:repeat(3,256px)!important;transform-origin:0 0!important;will-change:transform!important}\n.wallaa-sos-card .incoming-tile-grid img{display:block!important;width:256px!important;height:256px!important;max-width:none!important;object-fit:cover!important}\n`;
    fs.writeFileSync(cssPath,css);
  }
}
for(const rel of ['package.json','package-lock.json']){const p=path.join(root,rel);if(!fs.existsSync(p))continue;try{const j=JSON.parse(fs.readFileSync(p,'utf8'));j.version='4.0.64';if(j.packages?.[''])j.packages[''].version='4.0.64';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');}catch{}}
const project=path.join(root,'ios/App/App.xcodeproj/project.pbxproj');if(fs.existsSync(project)){let p=fs.readFileSync(project,'utf8');p=p.replace(/MARKETING_VERSION = [^;]+;/g,'MARKETING_VERSION = 4.0.64;').replace(/CURRENT_PROJECT_VERSION = \d+;/g,'CURRENT_PROJECT_VERSION = 67;');fs.writeFileSync(project,p);}
const patchNative=path.join(root,'scripts/patch-native.mjs');if(fs.existsSync(patchNative)){let p=fs.readFileSync(patchNative,'utf8');p=p.replace(/MARKETING_VERSION = 4\.0\.\d+;/g,'MARKETING_VERSION = 4.0.64;').replace(/CURRENT_PROJECT_VERSION = \d+;/g,'CURRENT_PROJECT_VERSION = 67;');fs.writeFileSync(patchNative,p);}
fs.writeFileSync(path.join(root,'RELEASE_4_0_64.md'),`# Wallaa App 4.0.64 — build 67\n\n- Corregge il mosaico OpenStreetMap nella schermata SOS ricevuto.\n- Elimina la fascia vuota laterale causata dal precedente calcolo CSS/percentuale.\n- Il punto GPS resta centrato mentre i 9 tile coprono l'intera area mappa.\n- Nessuna modifica alla logica SOS, Guardian o Sentinel.\n`);
console.log('✓ Wallaa App v4.0.64 SOS map layout fix applicato.');
console.log('✓ Build iOS impostata a 67.');
