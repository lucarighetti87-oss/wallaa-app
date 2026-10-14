from pathlib import Path
import tempfile,subprocess
source=(Path(__file__).resolve().parents[1]/'ios/App/App/AppDelegate.swift').read_text()
start=source.index('// New installations must select an accessory')
end=source.index('// Migration must finish before',start)
implementation=source[start:end]
harness=r"""
import Foundation
class UIImage {init?(contentsOfFile:String){};init?(systemName:String){} }
struct CBUUID {let string:String;init(string:String){self.string=string} }
class ASDiscoveryDescriptor {var bluetoothServiceUUID:CBUUID?}
class ASPickerDisplayItem {let descriptor:ASDiscoveryDescriptor;init(name:String,productImage:UIImage,descriptor:ASDiscoveryDescriptor){self.descriptor=descriptor} }
enum State {case authorized,unauthorized}
struct Accessory {let bluetoothIdentifier:UUID?;let state:State}
enum Kind {case activated,accessoryAdded,pickerDidDismiss,invalidated}
struct Event {let eventType:Kind;var accessory:Accessory?=nil;var error:Error?=nil}
class ASAccessorySession {
 static var latest:ASAccessorySession?
 var accessories:[Accessory]=[];var handler:((Event)->Void)?;var picker:[ASPickerDisplayItem]=[]
 init(){Self.latest=self}
 func activate(on:DispatchQueue,eventHandler:@escaping(Event)->Void){handler=eventHandler}
 func showPicker(for items:[ASPickerDisplayItem],completionHandler:(Error?)->Void){picker=items;completionHandler(nil)}
 func invalidate(){handler?(Event(eventType:.invalidated))}
 func fire(_ event:Event){handler?(event)}
}
"""+implementation+r"""
let manager=WallaaAccessoryPairing.shared,id=UUID();var results:[Result<String,Error>]=[]
manager.authorize(existingID:nil){results.append($0)}
let first=ASAccessorySession.latest!;first.fire(Event(eventType:.activated))
assert(results.isEmpty);assert(first.picker.count==3)
let accessory=Accessory(bluetoothIdentifier:id,state:.authorized);first.accessories=[accessory]
first.fire(Event(eventType:.accessoryAdded,accessory:accessory));assert(results.isEmpty)
first.fire(Event(eventType:.pickerDidDismiss));assert(results.count==1);assert(try! results.last!.get()==id.uuidString)
manager.authorize(existingID:nil){results.append($0)};let second=ASAccessorySession.latest!
first.fire(Event(eventType:.invalidated));assert(results.count==1)
second.fire(Event(eventType:.activated));manager.cancel();assert(results.count==2)
second.fire(Event(eventType:.pickerDidDismiss));assert(results.count==2)
manager.authorize(existingID:id.uuidString){results.append($0)};let existing=ASAccessorySession.latest!;existing.accessories=[accessory];existing.fire(Event(eventType:.activated))
assert(results.count==3);assert(existing.picker.isEmpty)
manager.authorize(existingID:id.uuidString){results.append($0)};let wrong=ASAccessorySession.latest!;wrong.fire(Event(eventType:.activated))
let other=Accessory(bluetoothIdentifier:UUID(),state:.authorized);wrong.accessories=[other];wrong.fire(Event(eventType:.accessoryAdded,accessory:other));wrong.fire(Event(eventType:.pickerDidDismiss))
assert(results.count==4);if case .success=results.last! {fatalError("wrong accessory accepted")}
print("PASS: new-install picker, wait for authorization, cancel, stale-session isolation, existing accessory and wrong-device rejection")
"""
with tempfile.TemporaryDirectory(prefix='wallaa-accessory-') as directory:
 root=Path(directory);(root/'test.swift').write_text(harness)
 subprocess.run(['swiftc','-module-cache-path',str(root/'cache'),str(root/'test.swift'),'-o',str(root/'test')],check=True)
 subprocess.run([str(root/'test')],check=True)
