// Reports existing readings; never invents missing battery or radio values.
export function buildButtonHeartbeat(device,telemetry={},connection={}){
 if(!device?.id||!device.hardwareId?.startsWith('MOKO:')||!device.claimToken||device.mokoSetupVerified!==true)return null;
 return {deviceId:device.id,hardwareId:device.hardwareId,claimToken:device.claimToken,status:connection.connected?'connected':'disconnected',battery:telemetry.battery??null,rssi:telemetry.rssi??null,lastSeenAt:telemetry.seenAt??null,notifyGuardians:false,health:{model:'WB-001',firmware:device.firmwareVersion,profileVersion:device.mokoProfileVersion,verified:true,ready:connection.ready===true,voltage:telemetry.batteryVoltageMv}};
}
