from pathlib import Path
import subprocess,tempfile
source=(Path(__file__).resolve().parents[1]/'ios/App/App/AppDelegate.swift').read_text()
a=source.index('    private var observedConfigurationValues:')
b=source.index('\n    func start()',a)
method=source[a:b].replace('@objc ','').replace('private var','var').replace('private func','func').replace('DispatchQueue.main.async','runImmediately')
harness="""
import Foundation
func runImmediately(_ body:()->Void){body()}
class UserDefaults { static let standard=UserDefaults();var values:[String:String]=[:];func string(forKey key:String)->String?{values[key]} }
class Manager {
 let configDefaultsKey="config",activeAlertDefaultsKey="alert",sentinelDefaultsKey="sentinel"
 var refreshes=0
 func refreshConfiguration(){refreshes+=1}
"""+method+"""
}
let m=Manager(),d=UserDefaults.standard
m.userDefaultsDidChange();assert(m.refreshes==1)
for i in 0..<100 {d.values["telemetry"]=String(i);m.userDefaultsDidChange()}
assert(m.refreshes==1)
d.values["config"]="new";m.userDefaultsDidChange();assert(m.refreshes==2)
d.values["alert"]="SOS";m.userDefaultsDidChange();assert(m.refreshes==3)
d.values["sentinel"]="active";m.userDefaultsDidChange();assert(m.refreshes==4)
d.values.removeValue(forKey:"alert");m.userDefaultsDidChange();assert(m.refreshes==5)
print("PASS: telemetry writes cannot trigger repeated configuration work; configuration, SOS and Sentinel transitions refresh immediately")
"""
with tempfile.TemporaryDirectory(prefix='wallaa-observer-') as directory:
 root=Path(directory);(root/'test.swift').write_text(harness)
 subprocess.run(['swiftc','-module-cache-path',str(root/'cache'),str(root/'test.swift'),'-o',str(root/'test')],check=True)
 subprocess.run([str(root/'test')],check=True)
