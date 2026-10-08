export const MOKO_FACTORY_PASSWORD='Moko4321';
export const MOKO_PROFILE_VERSION=3;
export const mokoUuid=short=>`0000${short.toLowerCase()}-0000-1000-8000-00805f9b34fb`;
export const MOKO_GATT={service:mokoUuid('aa00'),custom:mokoUuid('aa01'),password:mokoUuid('aa07'),disconnect:mokoUuid('aa02'),events:mokoUuid('aa08'),info:mokoUuid('180a')};
export function mokoBytes(input){
 if(input instanceof ArrayBuffer)return new Uint8Array(input);
 if(ArrayBuffer.isView(input))return new Uint8Array(input.buffer,input.byteOffset,input.byteLength);
 return Uint8Array.from(input||[]);
}
export function mokoPacket(input){
 const b=mokoBytes(input);
 if(b.length<4||b[0]!==0xeb||b.length!==4+b[3])return null;
 return {flag:b[1],command:b[2],data:b.slice(4)};
}
export function mokoAuthentication(password){
 if(typeof password!=='string'||!/^[\x20-\x7e]{1,16}$/.test(password))throw new Error('Password del pulsante non valida.');
 return Uint8Array.from([0xea,1,0x55,password.length,...password.split('').map(c=>c.charCodeAt(0))]);
}
export function mokoConnectionCounter(input){
 const p=mokoPacket(input);
 return p?.flag===2&&p.command===6&&p.data.length===1?p.data[0]:null;
}
export function mokoRead(command,data=[]){return Uint8Array.from([0xea,0,command,data.length,...data]);}
export function mokoWrite(command,data){return Uint8Array.from([0xea,1,command,data.length,...data]);}
// Official SDK: MKBXDInterface+MKBXDConfig / MKBXDAdopter. No reset, password,
// identity, power-off, or event-history deletion commands are used.
export const MOKO_SINGLE_CLICK_PROFILE=[
 {command:0x39,data:[0],read:[],expected:[0]},
 {command:0x22,data:[1],read:[],expected:[1]},
 {command:0x33,data:[0,0],read:[0],expected:[0,0]},
 {command:0x34,data:[0,1,0,3,0xe8,0],read:[0],expected:[0,1,0,3,0xe8,0]},
 {command:0x35,data:[0,1,0,0,0xc8,4,0,30],read:[0],expected:[0,1,0,0,0xc8,4,0,30]},
 {command:0x36,data:[0,1],read:[0],expected:[0,1]},
 ...[1,2,3].map(channel=>({command:0x34,data:[channel,0,0,3,0xe8,0],read:[channel],expected:[channel,0,0,3,0xe8,0]})),
 {command:0x37,data:[0,0],read:[0],expected:[0,0]},
 {command:0x37,data:[4,0],read:[4],expected:[4,0]}
];
export function equalMokoBytes(a,b){a=mokoBytes(a);b=mokoBytes(b);return a.length===b.length&&a.every((v,i)=>v===b[i]);}
