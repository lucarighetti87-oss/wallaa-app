from pathlib import Path
import subprocess,tempfile
source=(Path(__file__).resolve().parents[1]/'ios/App/App/AppDelegate.swift').read_text()
a=source.index('    private func sentinelHeartbeatTick()');b=source.index('\n    private var locationTrackingMode=',a)
tick=source[a:b]
a=source.index('    private func publishNativeSentinelHeartbeat(');b=source.index('\n    private func beginBackgroundTime()',a)
publish=source[a:b]
methods=(tick+publish).replace('private func','func').replace('Date()', 'clock').replace('DispatchQueue.main.async','runImmediately')
harness=r'''
import Foundation
func runImmediately(_ work:()->Void){work()}
struct CLLocation {struct Coordinate {var latitude=45.0,longitude=9.0};var coordinate=Coordinate();var horizontalAccuracy=100.0;var timestamp=Date();var course = -1.0}
enum Authorization {case authorizedAlways,denied}
class LocationManager {var location:CLLocation?;var authorizationStatus=Authorization.authorizedAlways;var requests=0;func requestLocation(){requests+=1}}
struct Identity {var authToken:String?="test-token",installationId:String?="test-installation"}
struct Config {var apiUrl="https://example.invalid/api/alert";var identity=Identity()}
typealias UIBackgroundTaskIdentifier=Int
extension Int {static let invalid = -1}
class UIApplication {enum State {case active,background};static let shared=UIApplication();var applicationState=State.background;var starts=0;func beginBackgroundTask(withName:String,expirationHandler:@escaping()->Void)->Int{starts+=1;return starts}}
class URLSession {
 static let shared=URLSession();var requests:[URLRequest]=[];var fail=false;var status=200
 struct Task {let run:()->Void;func resume(){run()}}
 func dataTask(with request:URLRequest,completionHandler:@escaping(Data?,URLResponse?,Error?)->Void)->Task{
  requests.append(request)
  return Task{if self.fail{completionHandler(nil,nil,NSError(domain:"network",code:1))}else{completionHandler(Data("{\"status\":\"available\"}".utf8),HTTPURLResponse(url:request.url!,statusCode:self.status,httpVersion:nil,headerFields:nil),nil)}}
 }
}
class Manager {
 let sentinelDefaultsKey="wallaa-test-sentinel-"+UUID().uuidString
 var clock=Date(),nativeSentinelShouldTrack=true,liveAlertId="",sentinelPublishing=false
 var sentinelLastAttemptAt=Date.distantPast,sentinelLastSentAt=Date.distantPast,sentinelLastLocationRequestAt=Date.distantPast
 var config:Config?=Config(),nativeSentinelState:Bool?=true,sentinelTask:UIBackgroundTaskIdentifier = .invalid
 let locationManager=LocationManager();var stops=0,finishes=0
 func reconcileSentinelHeartbeat(){stops+=1};func reconcileLocationTracking(){}
 func finishSentinelTask(){sentinelTask = .invalid;finishes+=1}
'''+methods+r'''
}
let m=Manager(),network=URLSession.shared
m.sentinelHeartbeatTick();assert(network.requests.count==1 && m.locationManager.requests==1)
let first=try! JSONSerialization.jsonObject(with:network.requests[0].httpBody!) as! [String:Any];assert(first["location"]==nil)
// Configuration bursts and radio callbacks cannot create GPS or HTTP storms.
for _ in 0..<100 {m.sentinelHeartbeatTick()};assert(network.requests.count==1 && m.locationManager.requests==1)
m.clock=m.clock.addingTimeInterval(60);m.sentinelHeartbeatTick();assert(network.requests.count==2 && m.locationManager.requests==1)
m.clock=m.clock.addingTimeInterval(60);m.sentinelHeartbeatTick();assert(network.requests.count==3 && m.locationManager.requests==2)
m.clock=m.clock.addingTimeInterval(60);m.locationManager.location=CLLocation(timestamp:m.clock.addingTimeInterval(-30));m.sentinelHeartbeatTick()
let payload=try! JSONSerialization.jsonObject(with:network.requests.last!.httpBody!) as! [String:Any]
let fix=payload["location"] as! [String:Any];assert(fix["capturedAt"] as? String==ISO8601DateFormatter().string(from:m.locationManager.location!.timestamp));assert(m.locationManager.requests==2)
// Failed network attempts are bounded too.
network.fail=true;m.clock=m.clock.addingTimeInterval(60);m.sentinelHeartbeatTick();let count=network.requests.count
for _ in 0..<100 {m.sentinelHeartbeatTick()};assert(network.requests.count==count)
m.nativeSentinelShouldTrack=false;m.sentinelHeartbeatTick();assert(m.stops==1)
m.nativeSentinelShouldTrack=true;m.locationManager.authorizationStatus = .denied;m.sentinelHeartbeatTick();assert(m.stops==2)
m.locationManager.authorizationStatus = .authorizedAlways;m.clock=m.clock.addingTimeInterval(300);m.liveAlertId="SOS";let gps=m.locationManager.requests;m.sentinelHeartbeatTick();assert(m.locationManager.requests==gps)
network.fail=false;network.status=401;m.clock=m.clock.addingTimeInterval(60);m.sentinelHeartbeatTick();assert(m.nativeSentinelState==nil)
assert(m.finishes>0)
print("PASS: native presence without GPS, minute HTTP limit, two-minute moderate refresh limit, true GPS age, network failure backoff, opt-out/permission cancellation and SOS separation")
'''
with tempfile.TemporaryDirectory(prefix='wallaa-sentinel-') as directory:
 root=Path(directory);p=root/'test.swift';p.write_text(harness)
 subprocess.run(['swiftc','-module-cache-path',str(root/'cache'),str(p),'-o',str(root/'test')],check=True)
 subprocess.run([str(root/'test')],check=True)
