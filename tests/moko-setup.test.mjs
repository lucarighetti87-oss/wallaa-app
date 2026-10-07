import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareMokoButton} from '../src/services/mokoSetup.js';
import {MOKO_GATT,mokoBytes,mokoUuid,MOKO_SINGLE_CLICK_PROFILE} from '../src/services/mokoSetupProtocol.js';

const device={id:'test-radio',hardwareId:'MOKO:010203040506',protocol:'moko-button'};
const view=bytes=>{const b=Uint8Array.from(bytes);return new DataView(b.buffer);};
function fixture(options={}){
 const callbacks=new Map(),settings=new Map(),writes=[],stages=[],claimed=[];let connections=0,claims=0;
 for(const step of MOKO_SINGLE_CLICK_PROFILE){const value=[...step.expected];if(step.command===0x35||step.command===0x36)value[1]=0;settings.set(`${step.command}:${step.read[0]??step.data[0]??''}`,value);}
 const emit=count=>callbacks.get(MOKO_GATT.events)?.(view([0xeb,2,6,1,count]));
 const ble={
  async connect(){connections++;},async disconnect(){},async stopNotifications(){},
  async getServices(){return [{uuid:'AA00',characteristics:['AA01','AA07','AA08'].map(uuid=>({uuid,properties:{read:uuid==='AA08'&&!options.noRead}}))}];},
  async startNotifications(id,service,char,callback){callbacks.set(char,callback);},
  async read(id,service,char){
   if(char===MOKO_GATT.events)return view([0xeb,2,6,1,0]);
   return view(new TextEncoder().encode(char===mokoUuid('2a28')?(options.software||'BXP-B-D'):'V2.0.3'));
  },
  async write(id,service,char,data){
   const bytes=[...mokoBytes(data)];writes.push({char,bytes});const [header,flag,command,length,...payload]=bytes;
   assert.equal(header,0xea);assert.equal(length,payload.length);
   let response;
   if(char===MOKO_GATT.password)response=[options.passwordError?0:0xaa];
   else if(flag===1){settings.set(`${command}:${payload[0]??''}`,payload);response=[options.rejectCommand===command?0:0xaa];}
   else if(command===0x20)response=options.wrongMac?[1,2,3,4,5,7]:[1,2,3,4,5,6];
   else{response=settings.get(`${command}:${payload[0]??''}`)||settings.get(`${command}:1`);if(options.badReadback&&command===0x36)response=[0,0];}
   queueMicrotask(()=>callbacks.get(char)?.(view([0xeb,flag,command,response.length,...response])));
  }
 };
 const args={device,ble,settleMs:0,commandTimeout:100,pressTimeout:100,
  async checkOwnership(){if(options.ownedByOther)throw new Error('Device already owned');return {allowed:!options.unconfirmedOwner};},
  async claim(){claims++;return{hardwareId:device.hardwareId,claimToken:'test-claim'};},
  async onClaim(value){claimed.push(value);},
  onProgress(stage){stages.push(stage);if(stage==='awaiting_press'&&!options.noPress)queueMicrotask(()=>emit(1));if(stage==='confirm_press'&&!options.noPress)queueMicrotask(()=>emit(2));}
 };
 return {args,writes,stages,claimed,get connections(){return connections;},get claims(){return claims;}};
}
test('factory setup confirms physical possession, configures and rereads every setting, and preserves identity/history',async()=>{
 const f=fixture();const result=await prepareMokoButton(f.args);
 assert.equal(f.claims,1);assert.equal(f.claimed[0].mokoSetupVerified,false);assert.equal(result.mokoConnectionBaseline,1);assert.equal(result.mokoProfileVersion,1);
 assert.ok(f.stages.indexOf('awaiting_press')<f.stages.indexOf('claiming'));
 const configuration=f.writes.filter(w=>w.char===MOKO_GATT.custom&&w.bytes[1]===1);
 assert.ok(configuration.length>=1);assert.ok(configuration.length<=MOKO_SINGLE_CLICK_PROFILE.length);
 for(const step of MOKO_SINGLE_CLICK_PROFILE)assert.ok(f.writes.some(w=>w.char===MOKO_GATT.custom&&w.bytes[1]===0&&w.bytes[2]===step.command&&w.bytes.slice(4).join(',')===step.read.join(',')));
 for(const w of configuration)assert.ok(![0x24,0x26,0x28,0x47,0x48,0x49,0x4d,0x50].includes(w.bytes[2]));
});
test('without an initial counter read, a second confirmation is required instead of trusting a stale first packet',async()=>{
 const f=fixture({noRead:true});const result=await prepareMokoButton(f.args);assert.equal(result.mokoConnectionBaseline,2);assert.ok(f.stages.includes('confirm_press'));
});
test('another owner blocks Bluetooth connection and configuration',async()=>{
 const f=fixture({ownedByOther:true});await assert.rejects(prepareMokoButton(f.args),/owned/);assert.equal(f.connections,0);assert.equal(f.writes.length,0);assert.equal(f.claims,0);
});
test('a mismatching MAC is rejected before pressure confirmation, claim, or configuration',async()=>{
 const f=fixture({wrongMac:true});await assert.rejects(prepareMokoButton(f.args),/corrisponde/);assert.equal(f.claims,0);assert.ok(!f.stages.includes('configuring'));
});
test('an unsupported firmware family is not configured',async()=>{
 const f=fixture({software:'BXP-CR'});await assert.rejects(prepareMokoButton(f.args),/compatibilità/);assert.equal(f.claims,0);
});
test('a changed factory password is reported without claiming or writing settings',async()=>{
 const f=fixture({passwordError:true});await assert.rejects(prepareMokoButton(f.args),e=>e.code==='MOKO_PASSWORD_REQUIRED');assert.equal(f.claims,0);
});
test('no confirmation press means no ownership claim or configuration',async()=>{
 const f=fixture({noPress:true});await assert.rejects(prepareMokoButton(f.args),/pressione/);assert.equal(f.claims,0);assert.ok(!f.stages.includes('configuring'));
});
test('a rejected setting leaves a recoverable incomplete claim and never returns verified settings',async()=>{
 const f=fixture({rejectCommand:0x35});await assert.rejects(prepareMokoButton(f.args),/accettato/);assert.equal(f.claimed[0].mokoSetupVerified,false);assert.ok(!f.stages.includes('verifying'));
});
test('successful write acknowledgements alone do not bypass readback verification',async()=>{
 const f=fixture({badReadback:true});await assert.rejects(prepareMokoButton(f.args),/confermate/);assert.equal(f.claimed[0].mokoSetupVerified,false);
});

test('a successful HTTP response without positive eligibility cannot start Bluetooth setup',async()=>{const f=fixture({unconfirmedOwner:true});await assert.rejects(prepareMokoButton(f.args),/disponibilità/);assert.equal(f.connections,0);});
