from pathlib import Path
import subprocess, tempfile
source = (Path(__file__).resolve().parents[1] / 'ios/App/App/AppDelegate.swift').read_text()
start = source.index('    private func updateNativeConnectionGuard(){')
end = source.index('\n    func clearHealthNotifications',start)
method = source[start:end].replace('private func','func').replace('UserDefaults.standard','defaults').replace('Date()', 'now')
harness = r"""
import Foundation
struct UNNotificationSoundName { init(_ value:String){} }
struct UNNotificationSound { init(named:UNNotificationSoundName){} }
class UNMutableNotificationContent { var title="",body=""; var sound:UNNotificationSound?; var userInfo:[String:Any]=[:] }
struct UNTimeIntervalNotificationTrigger { let timeInterval:Double; let repeats:Bool }
struct UNNotificationRequest { let identifier:String; let content:UNMutableNotificationContent; let trigger:UNTimeIntervalNotificationTrigger }
class UNUserNotificationCenter {
 static let shared=UNUserNotificationCenter(); var requests:[String:UNNotificationRequest]=[:]; var adds=0;var removals=0
 static func current()->UNUserNotificationCenter { shared }
 func removePendingNotificationRequests(withIdentifiers ids:[String]) { removals+=1;for id in ids { requests.removeValue(forKey:id) } }
 func removeDeliveredNotifications(withIdentifiers ids:[String]) {}
 func add(_ request:UNNotificationRequest) { requests[request.identifier]=request;adds+=1 }
}
struct Guard { var enabled:Bool?=true; var delaySeconds:Int?=60 }
struct Profile { var language:String?="en" }
struct Config { var armed=true;var connectionGuard:Guard?=Guard();var hardwareId:String?="MOKO:TEST";var profile=Profile() }
struct Peripheral {enum State {case connected,disconnected};var state=State.disconnected}
struct Events {var isNotifying=true}
class Manager {
 var mokoAuthenticated=false,mokoPeripheral:Peripheral?=Peripheral(),mokoEventsCharacteristic:Events?=Events()
 var now=Date()
 var disconnectFirstCheckAt:Date?,disconnectCheckedAt:Date?,disconnectCheckKey="",disconnectConfirmed=false
 var scheduledChecks=0
 func finishDisconnectCheck(){}
 func scheduleDisconnectConfirmation(){scheduledChecks+=1}
 let connectionGuardQueue=DispatchQueue(label:"test.guard")
 var config:Config?=Config(),mokoConnectionWanted=true,mokoDisconnectedAt:Date?=Date(),guardScheduledKey="",mokoStatus="disconnected"
 let defaults=UserDefaults(suiteName:UUID().uuidString)!
""" + method + r"""
}
let manager=Manager(),center=UNUserNotificationCenter.current()
manager.updateNativeConnectionGuard();manager.connectionGuardQueue.sync{}
assert(center.requests.isEmpty && !manager.disconnectConfirmed && manager.scheduledChecks==1)
for _ in 0..<100 { manager.updateNativeConnectionGuard() }
assert(center.requests.isEmpty && !manager.disconnectConfirmed)
manager.now=manager.now.addingTimeInterval(4.9);manager.updateNativeConnectionGuard()
assert(center.requests.isEmpty)
manager.now=manager.now.addingTimeInterval(0.1);manager.updateNativeConnectionGuard();manager.connectionGuardQueue.sync{}
assert(center.requests.count==3 && manager.disconnectConfirmed)
let sequence=center.requests.values.sorted{$0.trigger.timeInterval<$1.trigger.timeInterval}
assert(abs(sequence[0].trigger.timeInterval-55)<1)
assert(abs(sequence[1].trigger.timeInterval-sequence[0].trigger.timeInterval-300)<0.01)
assert(abs(sequence[2].trigger.timeInterval-sequence[1].trigger.timeInterval-300)<0.01)
assert(sequence.allSatisfy{!$0.trigger.repeats})
manager.updateNativeConnectionGuard();manager.connectionGuardQueue.sync{};assert(center.adds==3)
manager.guardScheduledKey="";manager.updateNativeConnectionGuard();manager.connectionGuardQueue.sync{};assert(center.adds==3)
manager.mokoStatus="ready";manager.mokoDisconnectedAt=nil;manager.updateNativeConnectionGuard();manager.connectionGuardQueue.sync{}
assert(center.requests.isEmpty)
let removalCount=center.removals
for _ in 0..<100 {manager.updateNativeConnectionGuard();manager.connectionGuardQueue.sync{}}
assert(center.removals==removalCount)
assert(manager.defaults.dictionary(forKey:"wallaa.disconnect.reminder-plan")==nil)
manager.mokoStatus="disconnected";manager.mokoDisconnectedAt=Date();manager.updateNativeConnectionGuard();manager.connectionGuardQueue.sync{}
assert(center.requests.isEmpty && !manager.disconnectConfirmed)
manager.now=manager.now.addingTimeInterval(5);manager.updateNativeConnectionGuard();manager.connectionGuardQueue.sync{}
assert(center.requests.count==3);assert(center.adds==6)
manager.config?.connectionGuard?.enabled=false;manager.updateNativeConnectionGuard();manager.connectionGuardQueue.sync{};assert(center.requests.isEmpty)
// Restoration may bypass the usual ready callback: live connection still cancels stale plans.
manager.config?.connectionGuard?.enabled=true;manager.mokoStatus="ready";manager.mokoAuthenticated=true;manager.mokoPeripheral?.state = .connected
manager.mokoDisconnectedAt=Date();manager.updateNativeConnectionGuard();manager.connectionGuardQueue.sync{}
assert(manager.mokoDisconnectedAt==nil && center.requests.isEmpty)
manager.mokoAuthenticated=false;manager.mokoPeripheral?.state = .disconnected
// A transient loss ends before confirmation and cannot leak into the next episode.
manager.config?.connectionGuard?.enabled=true;manager.mokoDisconnectedAt=Date();manager.updateNativeConnectionGuard()
manager.mokoStatus="ready";manager.mokoDisconnectedAt=nil;manager.updateNativeConnectionGuard();manager.connectionGuardQueue.sync{}
manager.now=manager.now.addingTimeInterval(20);manager.updateNativeConnectionGuard();manager.connectionGuardQueue.sync{}
assert(center.requests.isEmpty && !manager.disconnectConfirmed)
print("PASS: two checks five seconds apart, no poll-counting, transient cancellation, three reminders, five-minute spacing, no duplicate scheduling, reconnect cancellation, new episode and opt-out")
"""
with tempfile.TemporaryDirectory(prefix='wallaa-disconnect-') as directory:
 root=Path(directory);file=root/'test.swift';file.write_text(harness)
 subprocess.run(['swiftc','-module-cache-path',str(root/'cache'),str(file),'-o',str(root/'test')],check=True)
 subprocess.run([str(root/'test')],check=True)
