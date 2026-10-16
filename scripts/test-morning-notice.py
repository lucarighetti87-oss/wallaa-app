from pathlib import Path
import subprocess,tempfile
source=(Path(__file__).resolve().parents[1]/'ios/App/App/AppDelegate.swift').read_text()
policy=source[source.index('private enum WallaaMokoGATT {'):source.index('private enum WallaaMokoKeychain {')]
start=source.index('    private func observeMorningMotion(')
method=source[start:source.index('    private func observeHealthMotion(',start)].replace('private func','func').replace('UserDefaults.standard','self.defaults').replace('let now=Date()','let now=clock')
harness=r'''
import Foundation
struct UNNotificationSoundName {init(_ s:String){}}
struct UNNotificationSound {init(named:UNNotificationSoundName){}}
class UNMutableNotificationContent {var title="",body="";var sound:UNNotificationSound?;var userInfo:[String:Any]=[:]}
struct UNTimeIntervalNotificationTrigger {let timeInterval:Double;let repeats:Bool}
struct UNNotificationRequest {let identifier:String;let content:UNMutableNotificationContent;let trigger:UNTimeIntervalNotificationTrigger}
class UNUserNotificationCenter {
 static let shared=UNUserNotificationCenter();static func current()->UNUserNotificationCenter{shared}
 var sent:[UNNotificationRequest]=[];var fail=false
 func add(_ r:UNNotificationRequest,withCompletionHandler done:((Error?)->Void)?=nil){
  if fail {done?(NSError(domain:"test",code:1));return};sent.append(r);done?(nil)
 }
}
struct Profile {var firstName:String?="Luca",name:String?="Luca Righetti",language:String?="it"}
struct Config {var hardwareId:String?="MOKO:TEST";var profile=Profile()}
struct Peripheral {enum State {case connected,disconnected};var state=State.connected}
struct Events {var isNotifying=true}
private class Manager {
 var nativeMorningEnabled=true,mokoAuthenticated=true,mokoStatus="ready",config:Config?=Config()
 var mokoPeripheral:Peripheral?=Peripheral(),mokoEventsCharacteristic:Events?=Events()
 var morningMotion=WallaaMorningMotion(),morningMotionHardware="",morningNoticeKey="test.morning"
 let defaults=UserDefaults(suiteName:UUID().uuidString)!
 var clock=Calendar.current.date(from:DateComponents(year:2026,month:10,day:16,hour:6))!
'''+method+r'''
 func samples(_ x:Int){for _ in 0..<6 {clock=clock.addingTimeInterval(0.1);observeMorningMotion(["x":x,"y":0,"z":1000])}}
}
private let manager=Manager(),center=UNUserNotificationCenter.current()
manager.samples(0);assert(center.sent.isEmpty)
manager.samples(100);assert(center.sent.count==1)
assert(center.sent[0].content.title=="Buongiorno Luca")
assert(center.sent[0].content.body=="Sistema di sicurezza attivato")
assert(center.sent[0].content.userInfo["type"] as? String == "wallaa_morning")
for _ in 0..<20 {manager.samples(0);manager.samples(100)}
assert(center.sent.count==1)
// Relaunch keeps the daily receipt; clearing the bell cannot cause another push.
manager.morningMotion=WallaaMorningMotion();manager.samples(0);manager.samples(100)
assert(center.sent.count==1)
manager.clock=manager.clock.addingTimeInterval(86400);manager.mokoStatus="disconnected"
manager.samples(0);manager.samples(100);assert(center.sent.count==1)
manager.mokoStatus="ready";manager.morningMotion=WallaaMorningMotion()
manager.samples(0);manager.samples(100);assert(center.sent.count==2)
// Notification failures do not permanently consume the next day's greeting.
manager.clock=manager.clock.addingTimeInterval(86400);center.fail=true
manager.samples(0);manager.samples(100);assert(center.sent.count==2)
center.fail=false;manager.samples(0);manager.samples(100);assert(center.sent.count==3)
manager.clock=manager.clock.addingTimeInterval(86400);manager.nativeMorningEnabled=false
manager.samples(0);manager.samples(100);assert(center.sent.count==3)
print("PASS: personalized local notification, once per local day/relaunch, readiness gate, no SOS, delivery retry and disabled protection")
'''
with tempfile.TemporaryDirectory(prefix='wallaa-morning-') as directory:
 root=Path(directory);file=root/'main.swift';file.write_text('import Foundation\n'+policy+harness.replace('import Foundation\n',''))
 subprocess.run(['swiftc','-module-cache-path',str(root/'cache'),str(file),'-o',str(root/'test')],check=True)
 subprocess.run([str(root/'test')],check=True)
