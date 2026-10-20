from pathlib import Path
import subprocess,tempfile
source=(Path(__file__).resolve().parents[1]/'ios/App/App/AppDelegate.swift').read_text()
a=source.index('    private var observedConfigurationValues:')
b=source.index('\n    func start()',a)
method=source[a:b].replace('@objc ','').replace('private var','var').replace('private func','func').replace('DispatchQueue.main.async','runImmediately')
harness=r"""
import Foundation
func runImmediately(_ body:()->Void){body()}
class UserDefaults { static let standard=UserDefaults();var values:[String:String]=[:];func string(forKey key:String)->String?{values[key]} }
class WallaaAccessoryBootstrap {static let shared=WallaaAccessoryBootstrap();var ready=true}
class Manager {
 let configDefaultsKey="config",activeAlertDefaultsKey="alert",sentinelDefaultsKey="sentinel"
 var refreshes=0,locationRefreshes=0
 func refreshLocationConfiguration(){locationRefreshes+=1}
 func refreshConfiguration(){refreshes+=1}
"""+method+r"""
}
let m=Manager(),d=UserDefaults.standard
m.userDefaultsDidChange();assert(m.refreshes==1)
for i in 0..<100 {d.values["telemetry"]=String(i);m.userDefaultsDidChange()}
assert(m.refreshes==1)
d.values["config"]="new";m.userDefaultsDidChange();assert(m.refreshes==2)
d.values["alert"]="SOS";m.userDefaultsDidChange();assert(m.refreshes==3)
d.values["sentinel"]="active";m.userDefaultsDidChange();assert(m.refreshes==4)
d.values.removeValue(forKey:"alert");m.userDefaultsDidChange();assert(m.refreshes==5)
WallaaAccessoryBootstrap.shared.ready=false;d.values["sentinel"]="updated";m.userDefaultsDidChange();assert(m.locationRefreshes==1 && m.refreshes==5)
for _ in 0..<100 {m.userDefaultsDidChange()};assert(m.locationRefreshes==1)
d.values["config"]="{\"armed\":true,\"savedAt\":\"first\"}";m.userDefaultsDidChange();assert(m.locationRefreshes==2)
for i in 0..<100 {d.values["config"]="{\"savedAt\":\"\(i)\",\"armed\":true}";m.userDefaultsDidChange()}
assert(m.locationRefreshes==2)
d.values["config"]="{\"armed\":false,\"savedAt\":\"later\"}";m.userDefaultsDidChange();assert(m.locationRefreshes==3)
print("PASS: telemetry writes cannot trigger repeated configuration work; configuration, SOS and Sentinel transitions refresh immediately")
"""
with tempfile.TemporaryDirectory(prefix='wallaa-observer-') as directory:
 root=Path(directory);(root/'test.swift').write_text(harness)
 subprocess.run(['swiftc','-module-cache-path',str(root/'cache'),str(root/'test.swift'),'-o',str(root/'test')],check=True)
 subprocess.run([str(root/'test')],check=True)
