import {MOKO_FACTORY_PASSWORD,MOKO_PROFILE_VERSION,MOKO_GATT,mokoUuid,mokoBytes,mokoPacket,mokoAuthentication,mokoConnectionCounter,mokoRead,mokoWrite,MOKO_SINGLE_CLICK_PROFILE,equalMokoBytes} from './mokoSetupProtocol.js';

export async function prepareMokoButton({device,ble,password=MOKO_FACTORY_PASSWORD,onProgress=()=>{},checkOwnership,claim,onClaim=async()=>{},onCounter=()=>{},signal,commandTimeout=5000,pressTimeout=30000,settleMs=600}){
 if(!/^MOKO:[0-9A-F]{12}$/.test(device?.hardwareId||''))throw new Error('Identità del pulsante non verificata.');
 const controller=new AbortController();
 const cancel=()=>controller.abort(signal?.reason||new Error('Associazione annullata.'));
 signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 let pending=null,pressPending=null,ending=false,lastCounter=null,proofActive=false,stage='collegamento';
 const overall=setTimeout(()=>controller.abort(new Error('Configurazione interrotta: riprova con il pulsante vicino.')),150000);
 function abort(){const error=controller.signal.reason||new Error('Associazione interrotta.');pending?.reject(error);pressPending?.reject(error);}
 controller.signal.addEventListener('abort',abort);
 const ensure=()=>{if(controller.signal.aborted)throw controller.signal.reason;};
 function bounded(operation,timeout=commandTimeout){
  return new Promise((resolve,reject)=>{
   let done=false;
   const finish=(fn,value)=>{if(done)return;done=true;clearTimeout(timer);controller.signal.removeEventListener('abort',onAbort);fn(value);};
   const onAbort=()=>finish(reject,controller.signal.reason||new Error('Associazione interrotta.'));
   const timer=setTimeout(()=>finish(reject,new Error('Operazione non completata. Ripeti il collegamento.')),timeout);
   controller.signal.addEventListener('abort',onAbort,{once:true});
   Promise.resolve(operation).then(value=>finish(resolve,value),error=>finish(reject,error));
   if(controller.signal.aborted)onAbort();
  });
 }
 function waitReply(flag,command){
  ensure();
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Il pulsante non risponde. Avvicinalo e riprova.')),commandTimeout);
   pending={flag,command,resolve:data=>{clearTimeout(timer);pending=null;resolve(data);},reject:error=>{clearTimeout(timer);pending=null;reject(error);}};
  });
 }
 function onReply(value){const p=mokoPacket(value);if(p&&pending?.flag===p.flag&&pending.command===p.command)pending.resolve(p.data);}
 async function exchange(characteristic,command,flag,id){
  const result=waitReply(flag,id);
  try{const values=await Promise.all([ble.write(device.id,MOKO_GATT.service,characteristic,new DataView(command.buffer,command.byteOffset,command.byteLength),{timeout:commandTimeout}),result]);return values[1];}
  catch(error){pending?.reject(error);throw error;}
 }
 async function read(command,data=[]){return exchange(MOKO_GATT.custom,mokoRead(command,data),0,command);}
 try{
  ensure();onProgress('checking');const eligibility=await bounded(checkOwnership(device),15000);if(eligibility?.allowed!==true)throw new Error('Non ho confermato la disponibilità del pulsante per il tuo account.');ensure();onProgress('connecting');
  await bounded(ble.connect(device.id,()=>{if(!ending)controller.abort(new Error('Pulsante scollegato durante la configurazione.'));},{timeout:commandTimeout}));
  ensure();
  if(ble.discoverServices)await bounded(ble.discoverServices(device.id));
  const services=await bounded(ble.getServices(device.id));
  const match=(value,expected)=>{const v=String(value||'').toLowerCase();return v===expected||(/^[0-9a-f]{4}$/.test(v)&&mokoUuid(v)===expected);};
  const service=services.find(s=>match(s.uuid,MOKO_GATT.service));
  for(const uuid of [MOKO_GATT.custom,MOKO_GATT.password,MOKO_GATT.events])if(!service?.characteristics?.some(c=>match(c.uuid,uuid)))throw new Error('Questo pulsante non supporta la configurazione Wallaa.');
  stage='autenticazione';
  await bounded(ble.startNotifications(device.id,MOKO_GATT.service,MOKO_GATT.password,onReply));
  await bounded(ble.startNotifications(device.id,MOKO_GATT.service,MOKO_GATT.custom,onReply));
  onProgress('authenticating');
  const auth=await exchange(MOKO_GATT.password,mokoAuthentication(password),1,0x55);
  if(!equalMokoBytes(auth,[0xaa])){const e=new Error('La password di fabbrica non è stata accettata. Se è stata cambiata, inseriscila nelle opzioni del pulsante.');e.code='MOKO_PASSWORD_REQUIRED';throw e;}
  const mac=await read(0x20);
  const actual='MOKO:'+Array.from(mac).map(n=>n.toString(16).padStart(2,'0').toUpperCase()).join('');
  if(actual!==device.hardwareId)throw new Error('Il pulsante collegato non corrisponde a quello selezionato.');
  const decodeText=value=>new TextDecoder().decode(mokoBytes(value)).replace(/\0+$/g,'').trim();
  stage='informazioni del pulsante';
  if(ble.discoverServices)await bounded(ble.discoverServices(device.id));
  const refreshed=await bounded(ble.getServices(device.id));
  const infoService=refreshed.find(s=>match(s.uuid,MOKO_GATT.info));
  // Vendor SDK MKBXDInterface: newer firmware uses AA01 commands 2c/2b
  // when standard Device Information characteristics are absent.
  const text=async(uuid,command)=>{
   const standard=infoService?.characteristics?.some(c=>match(c.uuid,mokoUuid(uuid)));
   return decodeText(standard?await bounded(ble.read(device.id,MOKO_GATT.info,mokoUuid(uuid),{timeout:commandTimeout})):await read(command));
  };
  const software=await text('2a28',0x2c),firmware=await text('2a26',0x2b);
  if(software!=='BXP-B-D'||!/^V?2\./i.test(firmware))throw new Error('Questa versione del pulsante richiede una verifica di compatibilità Wallaa.');
  stage='pressione di conferma';
  await bounded(ble.startNotifications(device.id,MOKO_GATT.service,MOKO_GATT.events,value=>{
   const counter=mokoConnectionCounter(value);if(counter===null)return;
   const previous=lastCounter;lastCounter=counter;onCounter(counter);
   if(!proofActive)return;
   if(previous===null||counter===0){onProgress('confirm_press');return;}
   if(previous!==counter)pressPending?.resolve(counter);
  }));
  const events=service.characteristics.find(c=>match(c.uuid,MOKO_GATT.events));
  if(events.properties?.read){try{lastCounter=mokoConnectionCounter(await ble.read(device.id,MOKO_GATT.service,MOKO_GATT.events,{timeout:2000}));}catch{}}
  await new Promise(resolve=>setTimeout(resolve,settleMs));ensure();
  proofActive=true;
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Non ho ricevuto la pressione di conferma. Ripeti il collegamento e premi il tuo pulsante quando richiesto.')),pressTimeout);
   pressPending={resolve:value=>{clearTimeout(timer);pressPending=null;resolve(value);},reject:error=>{clearTimeout(timer);pressPending=null;reject(error);}};
   onProgress('awaiting_press');
  });
  proofActive=false;ensure();onProgress('claiming');
  const ownership=await bounded(claim(device,eligibility),15000);ensure();
  if(ownership?.hardwareId!==device.hardwareId||typeof ownership?.claimToken!=='string'||!ownership.claimToken)throw new Error('L’associazione del pulsante non è stata confermata dal servizio Wallaa.');
  const claimed={...device,hardwareId:ownership.hardwareId||device.hardwareId,claimToken:ownership.claimToken,mokoSetupVerified:false,mokoContinuousEnabled:true,pairingButtonEvent:'press',name:'Wallaa Button',monitorMode:'event-only',permanentOwnership:true};
  await bounded(onClaim(claimed));ensure();
  stage='impostazioni';onProgress('configuring');
  for(const step of MOKO_SINGLE_CLICK_PROFILE){
   const current=await read(step.command,step.read);
   if(equalMokoBytes(current,step.expected))continue;
   const ack=await exchange(MOKO_GATT.custom,mokoWrite(step.command,step.data),1,step.command);
   if(!equalMokoBytes(ack,[0xaa]))throw new Error('Il pulsante non ha accettato le impostazioni. Ripeti la configurazione.');
   const confirmed=await read(step.command,step.read);
   if(!equalMokoBytes(confirmed,step.expected))throw new Error('Le impostazioni del pulsante non sono state confermate. Ripeti la configurazione.');
  }
  onProgress('verifying');ensure();
  return {...claimed,mokoProfileVersion:MOKO_PROFILE_VERSION,mokoSetupVerifiedAt:new Date().toISOString(),mokoConnectionBaseline:lastCounter,softwareVersion:software,firmwareVersion:firmware};
 }catch(error){
  if(/Characteristic not found/i.test(error.message||''))throw new Error(`Collegamento Bluetooth incompleto (${stage}). Tieni il pulsante vicino all’iPhone e riprova.`);
  throw error;
 }finally{
  ending=true;clearTimeout(overall);signal?.removeEventListener('abort',cancel);controller.signal.removeEventListener('abort',abort);
  pending?.reject(new Error('Associazione conclusa.'));pressPending?.reject(new Error('Associazione conclusa.'));
  const cleanup=operation=>Promise.race([operation.catch(()=>{}),new Promise(resolve=>setTimeout(resolve,1500))]);
  for(const characteristic of [MOKO_GATT.password,MOKO_GATT.custom,MOKO_GATT.events])await cleanup(ble.stopNotifications(device.id,MOKO_GATT.service,characteristic));
  await cleanup(ble.disconnect(device.id));
 }
}
