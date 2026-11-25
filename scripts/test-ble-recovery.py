"""Execute the production recovery methods with a deterministic Bluetooth/scheduler harness."""
from pathlib import Path
import subprocess, tempfile
source=(Path(__file__).resolve().parents[1]/'ios/App/App/AppDelegate.swift').read_text()
def method(signature):
 start=source.index(signature); brace=source.index('{',start); depth=1; end=brace+1
 while depth:
  if source[end]=='{':depth+=1
  if source[end]=='}':depth-=1
  end+=1
 return source[start:end].replace('private func','func')
policy=source[source.index('private struct WallaaBLERecovery {'):source.index('private enum WallaaMokoGATT {')].replace('private struct WallaaBLERecovery','struct WallaaBLERecovery')
methods='\n'.join(method(x) for x in ['private func createMokoCentral()', 'private func clearMokoTransport()', 'private func cancelMokoConnection(', 'private func armMokoDisconnectRecovery(', 'private func rebuildMokoCentral(', 'private func armMokoConnectTimeout(', 'func centralManagerDidUpdateState(', 'func centralManager(_ central: CBCentralManager, didDisconnectPeripheral', 'func peripheral(_ peripheral: CBPeripheral, didModifyServices'])
stubs=r'''
import Foundation
final class DispatchWorkItem {
 let action:()->Void; var cancelled=false
 init(block:@escaping()->Void){action=block}
 func cancel(){cancelled=true}
 func perform(){if !cancelled {action()}}
}
extension Double {static func now()->Double{0}}
final class DispatchQueue {
 static let main=DispatchQueue();var jobs:[(Double,DispatchWorkItem)]=[]
 func asyncAfter(deadline:Double,execute:DispatchWorkItem){jobs.append((deadline,execute))}
}
enum RadioState {case poweredOn,poweredOff,resetting,unknown;var rawValue:Int{0}}
enum PeripheralState {case connecting,connected,disconnecting,disconnected}
struct CBUUID:Equatable {let string:String;init(string:String){self.string=string}}
final class CBService {let uuid:CBUUID;init(_ id:String){uuid=CBUUID(string:id)}}
final class CBPeripheral:NSObject {var state:PeripheralState = .connecting;weak var delegate:AnyObject?}
let CBCentralManagerOptionRestoreIdentifierKey="restore",CBCentralManagerOptionShowPowerAlertKey="alert"
final class CBCentralManager:NSObject {
 var state:RadioState = .unknown;weak var delegate:AnyObject?;var cancellations=0;var stops=0
 init(delegate:AnyObject?,queue:Any?,options:[String:Any]){self.delegate=delegate}
 func cancelPeripheralConnection(_ p:CBPeripheral){cancellations+=1;p.state = .disconnecting}
 func stopScan(){stops+=1}
}
final class UIApplication {static let shared=UIApplication();var applicationState=AppState.active}
enum AppState {case active,background}
struct ClickGate {var resets=0;mutating func reset(){resets+=1}}
'''
fields=r'''
 var central:CBCentralManager?,mokoPeripheral:CBPeripheral?
 let restoreIdentifier="unchanged-account-restoration"
 var mokoConnectTimeout:DispatchWorkItem?,mokoDisconnectTimeout:DispatchWorkItem?,mokoHandshakeTimeout:DispatchWorkItem?,mokoStreamReady:DispatchWorkItem?,mokoRetry:DispatchWorkItem?,mokoTelemetryTimeout:DispatchWorkItem?,mokoMotionTimeout:DispatchWorkItem?
 var mokoRecovery=WallaaBLERecovery(),mokoAuthenticated=true,mokoAuthenticationSent=true,mokoResetInFlight=true,mokoAuthenticationBlocked=false,mokoConnectionWanted=true
 var mokoTelemetryCommand:UInt8?=1,mokoTelemetryQueue:[UInt8]=[1,2]
 var mokoTelemetryAt=Date(),mokoLastRssiAt=Date(),mokoRetryAt=Date(),mokoDisconnectedAt:Date?
 var mokoPasswordCharacteristic:Int?=1,mokoEventsCharacteristic:Int?=2,mokoMotionCharacteristic:Int?=3,mokoControlCharacteristics=[1,2,3]
 var mokoRssi:Int? = -40,mokoRssiMeasuredAt:Date?=Date()
 var healthMotionAnchor:[String:Int]?=["x":1],healthPreviousAxes:[String:Int]?=["x":1],healthMotionSamples:[[String:Int]]=[["x":1]],healthPhoneMotionStreak=3
 var sosClickGate=ClickGate(),mokoStatus="ready",mokoDisconnectReason=""
 var connections=0,retries=0,locationReconciliations=0
 func reconcileMokoConnection(){connections+=1}
 func scheduleMokoReconnect(){retries+=1}
 func reconcileHealthPhoneMotion(){}
 func reconcileLocationTracking(){locationReconciliations+=1}
 func updateNativeConnectionGuard(){}
 func startScanIfNeeded(forceRestart:Bool,reason:String){}
'''
tests=r'''
func manager()->Manager {
 let m=Manager();m.createMokoCentral();m.central!.state = .poweredOn
 m.mokoPeripheral=CBPeripheral();m.mokoPeripheral!.delegate=m
 return m
}
let reset=manager(),oldPeripheral=reset.mokoPeripheral!
let staleGeneration=reset.mokoRecovery.generation
reset.central!.state = .resetting;reset.centralManagerDidUpdateState(reset.central!)
assert(reset.mokoPeripheral==nil && !reset.mokoAuthenticated)
assert(reset.mokoEventsCharacteristic==nil && reset.mokoControlCharacteristics.isEmpty)
assert(reset.mokoTelemetryQueue.isEmpty && !reset.mokoResetInFlight)
assert(!reset.mokoRecovery.isCurrent(staleGeneration) && oldPeripheral.delegate==nil)
reset.central!.state = .poweredOn;reset.centralManagerDidUpdateState(reset.central!)
assert(reset.connections==1)
let stalled=manager(),oldCentral=stalled.central!,p=stalled.mokoPeripheral!
stalled.armMokoConnectTimeout(p);let connectTimeout=stalled.mokoConnectTimeout!
connectTimeout.perform();assert(oldCentral.cancellations==1 && !stalled.mokoAuthenticated)
let cancellation=stalled.mokoDisconnectTimeout!;cancellation.perform()
assert(stalled.central !== oldCentral && oldCentral.delegate==nil && p.delegate==nil)
assert(stalled.mokoPeripheral==nil && stalled.mokoStatus=="recovering")
assert(!stalled.mokoAuthenticated && stalled.mokoEventsCharacteristic==nil)
// A stale callback from the replaced central cannot disconnect the new session.
stalled.mokoStatus="ready";stalled.centralManager(oldCentral,didDisconnectPeripheral:p,error:nil)
assert(stalled.mokoStatus=="ready")
let healed=manager(),healedPeripheral=healed.mokoPeripheral!
healed.armMokoDisconnectRecovery(healedPeripheral);let stale=healed.mokoDisconnectTimeout!
healed.clearMokoTransport();healed.mokoAuthenticated=true;healed.mokoStatus="ready"
stale.action();assert(healed.mokoAuthenticated && healed.mokoStatus=="ready")
// Ordinary disconnect schedules one retry and removes every old command/timeout.
let ordinary=manager();ordinary.armMokoDisconnectRecovery(ordinary.mokoPeripheral!)
let pending=ordinary.mokoDisconnectTimeout!
ordinary.centralManager(ordinary.central!,didDisconnectPeripheral:ordinary.mokoPeripheral!,error:nil)
assert(ordinary.retries==1 && ordinary.mokoConnectTimeout==nil && pending.cancelled)
assert(ordinary.mokoControlCharacteristics.isEmpty && !ordinary.mokoAuthenticated)
// Wrong passwords / explicit opt-out must never be bypassed by recovery.
for blocked in [true,false] {
 let m=manager(),c=m.central!;m.mokoAuthenticationBlocked=blocked;m.mokoConnectionWanted=blocked
 m.armMokoDisconnectRecovery(m.mokoPeripheral!);m.mokoDisconnectTimeout!.perform()
 assert(m.central === c && c.stops==0)
}
let limited=manager(),limitedCentral=limited.central!
limited.mokoRecovery.didRebuild(at:Date());limited.rebuildMokoCentral(reason:"repeat")
assert(limited.central === limitedCentral && limited.mokoDisconnectTimeout != nil)
assert(DispatchQueue.main.jobs.last!.0>55)
var policy=WallaaBLERecovery();let t=Date(timeIntervalSince1970:1000)
assert(policy.rebuildDelay(at:t)==0);policy.didRebuild(at:t)
assert(policy.rebuildDelay(at:t.addingTimeInterval(30))==30)
assert(policy.rebuildDelay(at:t.addingTimeInterval(60))==0)
let changed=manager();changed.peripheral(changed.mokoPeripheral!,didModifyServices:[CBService("180F")])
assert(changed.central!.cancellations==0)
changed.peripheral(changed.mokoPeripheral!,didModifyServices:[CBService("AA00")])
assert(changed.central!.cancellations==1 && !changed.mokoAuthenticated && changed.mokoDisconnectTimeout != nil)
let idle=manager();assert(idle.mokoDisconnectTimeout==nil && idle.mokoConnectTimeout==nil)
print("PASS: radio reset, missing cancellation callback, stale session isolation, retry cleanup, password/opt-out, cooldown, service invalidation, idle without polling")
'''
with tempfile.TemporaryDirectory(prefix='wallaa-ble-recovery-') as d:
 root=Path(d);p=root/'main.swift';p.write_text(stubs+policy+'\nfinal class Manager {\n'+fields+methods+'\n}\n'+tests)
 subprocess.run(['swiftc','-module-cache-path',str(root/'cache'),str(p),'-o',str(root/'test')],check=True)
 subprocess.run([str(root/'test')],check=True)
