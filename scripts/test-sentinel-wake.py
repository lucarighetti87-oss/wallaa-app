from pathlib import Path
import subprocess,tempfile

source=(Path(__file__).resolve().parents[1]/'ios/App/App/AppDelegate.swift').read_text()
a=source.index('    func handleSentinelLocationRequest(')
b=source.index('    private var significantMonitoringActive=',a)
methods=source[a:b].replace('private func','func')
harness=r'''
import Foundation
enum UIBackgroundFetchResult {case noData,newData,failed}
enum Authorization {case authorizedAlways,denied}
struct CLLocation {var horizontalAccuracy:Double=5;var timestamp=Date()}
class LocationManager {var location:CLLocation?;var authorizationStatus=Authorization.authorizedAlways}
class Manager {
 var nativeSentinelShouldTrack=true,sentinelPublishing=false,precise=false
 let locationManager=LocationManager()
 var sentinelWakeID:UUID?,sentinelWakeCompletions:[(UIBackgroundFetchResult)->Void]=[]
 var sentinelWakeLastAt=Date.distantPast,sentinelWakeTimeout:DispatchWorkItem?
 var uploads=0,forced=false,pendingUpload:((Bool)->Void)?
 func refreshLocationConfiguration(){}
 func reconcileLocationTracking(){precise=sentinelWakeID != nil}
 func publishNativeSentinelHeartbeat(_ location:CLLocation?,force:Bool=false,completion:((Bool)->Void)?=nil){uploads+=1;forced=force;sentinelPublishing=true;pendingUpload=completion}
'''+methods+r'''
}
let m=Manager();var results:[UIBackgroundFetchResult]=[]
// Missing/stale GPS cannot be reported as a successful wake.
m.locationManager.location=CLLocation(timestamp:Date().addingTimeInterval(-600))
m.handleSentinelLocationRequest{results.append($0)}
assert(m.precise && m.uploads==0)
m.handleSentinelLocationRequest{results.append($0)}
assert(m.sentinelWakeCompletions.count==2 && m.uploads==0)
m.sentinelWakeTimeout?.perform()
assert(results.count==2 && results.allSatisfy{$0 == .noData} && !m.precise)
// A recent accurate fix bypasses the ordinary heartbeat rate limit, but completion
// waits for HTTP acknowledgment. Both success and failure restore low-power mode.
m.sentinelWakeLastAt = .distantPast;m.locationManager.location=CLLocation()
m.handleSentinelLocationRequest{results.append($0)}
assert(m.uploads==1 && m.forced && m.precise && results.count==2)
m.pendingUpload?(true);m.sentinelPublishing=false
assert(results.last == .newData && !m.precise && m.sentinelWakeID==nil)
m.handleSentinelLocationRequest{results.append($0)};assert(m.uploads==1 && results.last == .noData)
m.sentinelWakeLastAt = .distantPast
m.handleSentinelLocationRequest{results.append($0)};m.pendingUpload?(false);m.sentinelPublishing=false
assert(results.last == .failed && !m.precise)
// Opt-out and revoked authorization never start GPS or an upload.
let count=m.uploads;m.nativeSentinelShouldTrack=false
m.handleSentinelLocationRequest{results.append($0)};assert(m.uploads==count)
m.nativeSentinelShouldTrack=true;m.locationManager.authorizationStatus = .denied
m.handleSentinelLocationRequest{results.append($0)};assert(m.uploads==count && !m.precise)
print("PASS: bounded native Sentinel wake, fresh accurate cache, concurrent wake coalescing, HTTP acknowledgment, cooldown, timeout, opt-out and permission rejection")
'''
with tempfile.TemporaryDirectory(prefix='wallaa-sentinel-wake-') as directory:
 root=Path(directory);p=root/'test.swift';p.write_text(harness)
 subprocess.run(['swiftc','-module-cache-path',str(root/'cache'),str(p),'-o',str(root/'test')],check=True)
 subprocess.run([str(root/'test')],check=True)
