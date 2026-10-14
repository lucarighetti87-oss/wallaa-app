from pathlib import Path
import subprocess, tempfile
source = (Path(__file__).resolve().parents[1] / 'ios/App/App/AppDelegate.swift').read_text()
start = source.index('    private func updateNativeConnectionGuard(){')
end = source.index('\n    func clearHealthNotifications',start)
method = source[start:end].replace('private func','func').replace('UserDefaults.standard','defaults')
harness = r"""
import Foundation
struct UNNotificationSoundName { init(_ value:String){} }
struct UNNotificationSound { init(named:UNNotificationSoundName){} }
class UNMutableNotificationContent { var title="",body=""; var sound:UNNotificationSound?; var userInfo:[String:Any]=[:] }
struct UNTimeIntervalNotificationTrigger { let timeInterval:Double; let repeats:Bool }
struct UNNotificationRequest { let identifier:String; let content:UNMutableNotificationContent; let trigger:UNTimeIntervalNotificationTrigger }
class UNUserNotificationCenter {
 static let shared=UNUserNotificationCenter(); var requests:[String:UNNotificationRequest]=[:]; var adds=0
 static func current()->UNUserNotificationCenter { shared }
 func removePendingNotificationRequests(withIdentifiers ids:[String]) { for id in ids { requests.removeValue(forKey:id) } }
 func add(_ request:UNNotificationRequest) { requests[request.identifier]=request;adds+=1 }
}
struct Guard { var enabled:Bool?=true; var delaySeconds:Int?=60 }
struct Profile { var language:String?="en" }
struct Config { var armed=true;var connectionGuard:Guard?=Guard();var hardwareId:String?="MOKO:TEST";var profile=Profile() }
class Manager {
 var config:Config?=Config(),mokoConnectionWanted=true,mokoDisconnectedAt:Date?=Date(),guardScheduledKey="",mokoStatus="disconnected"
 let defaults=UserDefaults(suiteName:UUID().uuidString)!
""" + method + r"""
}
let manager=Manager(),center=UNUserNotificationCenter.current()
manager.updateNativeConnectionGuard()
assert(center.requests.count==3)
let sequence=center.requests.values.sorted{$0.trigger.timeInterval<$1.trigger.timeInterval}
assert(abs(sequence[0].trigger.timeInterval-60)<1)
assert(abs(sequence[1].trigger.timeInterval-sequence[0].trigger.timeInterval-300)<0.01)
assert(abs(sequence[2].trigger.timeInterval-sequence[1].trigger.timeInterval-300)<0.01)
assert(sequence.allSatisfy{!$0.trigger.repeats})
manager.updateNativeConnectionGuard();assert(center.adds==3)
manager.guardScheduledKey="";manager.updateNativeConnectionGuard();assert(center.adds==3)
manager.mokoStatus="ready";manager.mokoDisconnectedAt=nil;manager.updateNativeConnectionGuard()
assert(center.requests.isEmpty)
assert(manager.defaults.dictionary(forKey:"wallaa.disconnect.reminder-plan")==nil)
manager.mokoStatus="disconnected";manager.mokoDisconnectedAt=Date();manager.updateNativeConnectionGuard()
assert(center.requests.count==3);assert(center.adds==6)
manager.config?.connectionGuard?.enabled=false;manager.updateNativeConnectionGuard();assert(center.requests.isEmpty)
print("PASS: three reminders, five-minute spacing, no duplicate scheduling, reconnect cancellation, new episode and opt-out")
"""
with tempfile.TemporaryDirectory(prefix='wallaa-disconnect-') as directory:
 root=Path(directory);file=root/'test.swift';file.write_text(harness)
 subprocess.run(['swiftc','-module-cache-path',str(root/'cache'),str(file),'-o',str(root/'test')],check=True)
 subprocess.run([str(root/'test')],check=True)
