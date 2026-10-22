import fs from 'node:fs';
const problems=[];
if(!fs.existsSync('android/app/google-services.json'))problems.push('Configurazione Firebase Android mancante: scaricare google-services.json per it.wallaa.safebutton.');
else {try{const d=JSON.parse(fs.readFileSync('android/app/google-services.json'));if(!d.client?.some(c=>c.client_info?.android_client_info?.package_name==='it.wallaa.safebutton'))problems.push('Il progetto Firebase non contiene it.wallaa.safebutton.');}catch{problems.push('google-services.json non valido.');}}
if(!fs.existsSync('android/keystore.properties'))problems.push('Chiave di upload Google Play non configurata.');
if(process.env.WALLAA_ANDROID_PHYSICAL_QA!=='passed')problems.push('Test su Android fisico non ancora confermati: Bluetooth, SOS controllato, background, notifiche e batteria.');
if(problems.length){console.error('Pubblicazione Google Play non pronta:\n'+problems.map(x=>'- '+x).join('\n'));process.exitCode=1;}else console.log('Prerequisiti locali presenti. Verificare anche scheda e dichiarazioni in Google Play Console.');
