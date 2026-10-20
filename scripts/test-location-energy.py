from pathlib import Path
import tempfile,subprocess
source=(Path(__file__).resolve().parents[1]/'ios/App/App/AppDelegate.swift').read_text()
start=source.index('    private var significantMonitoringActive=')
end=source.index('    private func publishNativeSentinelHeartbeat',start)
# Only exercise the policy, not the following heartbeat helper.
end=source.index('\n    private func ',source.index('    private func reconcileLocationTracking()',start)+20)
method='var locationTrackingMode=""\n'+source[start:end].replace('private var','var').replace('private func','func')
harness=r"""
import Foundation
let kCLLocationAccuracyBest=1.0,kCLDistanceFilterNone = -1.0,kCLLocationAccuracyHundredMeters=100.0
class UIApplication {static let shared=UIApplication();var applicationState=AppState.active}
enum AppState{case active,background}
enum Authorization:Int{case authorizedAlways,authorizedWhenInUse,denied,notDetermined}
struct CLLocation {var horizontalAccuracy=0.0;var timestamp=Date()}
class CLLocationManager {
 var location:CLLocation?=nil
 var authorizationStatus=Authorization.authorizedAlways,desiredAccuracy=1.0,distanceFilter = -1.0,pausesLocationUpdatesAutomatically=false
 var starts=0,stops=0,requests=0,significant=0
 static func significantLocationChangeMonitoringAvailable()->Bool{true}
 func startUpdatingLocation(){starts+=1};func stopUpdatingLocation(){stops+=1}
 func requestLocation(){requests+=1};func startMonitoringSignificantLocationChanges(){significant+=1};func stopMonitoringSignificantLocationChanges(){}
 func requestAlwaysAuthorization(){}
}
struct SentinelState {var status="available"}
class Manager {
 var nativeSentinelState:SentinelState?,sentinelWakeID:UUID?
 var nativeSentinelShouldTrack=false,nativeGuardianShouldTrack=false,liveAlertId="",communityRequestedAlways=false
 func publishNativeSentinelHeartbeat(_ location:CLLocation){}
 func reconcileSentinelHeartbeat(){}
 let locationManager=CLLocationManager()
"""+method+r"""
}
let m=Manager()
m.reconcileLocationTracking();assert(m.locationManager.starts==0)
m.nativeGuardianShouldTrack=true;m.reconcileLocationTracking()
assert(m.locationTrackingMode=="passive");assert(m.locationManager.starts==0);assert(m.locationManager.requests==1)
let significantStarts=m.locationManager.significant,stopCount=m.locationManager.stops
for _ in 0..<100 {m.reconcileLocationTracking()}
assert(m.locationManager.requests==1);assert(m.locationManager.significant==significantStarts);assert(m.locationManager.stops==stopCount)
m.nativeSentinelShouldTrack=true;m.reconcileLocationTracking()
assert(m.locationTrackingMode=="sentinel");assert(m.locationManager.desiredAccuracy==100);assert(m.locationManager.distanceFilter==50)
m.sentinelWakeID=UUID();m.reconcileLocationTracking();assert(m.locationTrackingMode=="sentinel-refresh" && m.locationManager.desiredAccuracy==1)
m.sentinelWakeID=nil;m.reconcileLocationTracking();assert(m.locationManager.desiredAccuracy==100)
m.nativeSentinelState=SentinelState(status:"busy");m.reconcileLocationTracking();assert(m.locationTrackingMode=="emergency")
m.nativeSentinelState=nil;
m.liveAlertId="sos";m.reconcileLocationTracking()
assert(m.locationTrackingMode=="emergency");assert(m.locationManager.desiredAccuracy==1);assert(m.locationManager.distanceFilter == -1)
m.liveAlertId="";m.nativeSentinelShouldTrack=false;m.reconcileLocationTracking();assert(m.locationTrackingMode=="passive")
m.locationManager.authorizationStatus = .denied;m.reconcileLocationTracking();assert(m.locationTrackingMode=="off")
print("PASS: ordinary readiness avoids continuous GPS, Sentinel balanced, SOS precise, return to idle and permission changes")
"""
with tempfile.TemporaryDirectory(prefix='wallaa-location-') as directory:
 root=Path(directory);(root/'test.swift').write_text(harness)
 subprocess.run(['swiftc','-module-cache-path',str(root/'cache'),str(root/'test.swift'),'-o',str(root/'test')],check=True)
 subprocess.run([str(root/'test')],check=True)
