from pathlib import Path
import subprocess,tempfile
s=Path('ios/App/App/AppDelegate.swift').read_text()
gate=s[s.index('private struct WallaaSOSClickGate'):]
assert '["press", "double_press", "any_press"].contains(config.trigger)' in s
assert 'acknowledgeMokoPress()\n            return' in s
assert 'sosClickGate.reset()\n        mokoStatus = "synchronizing"' in s
h='import Foundation\n'+gate+'''
private var gate=WallaaSOSClickGate();let now=Date()
assert(gate.accept(mode:"press",quantity:1,at:now))
assert(!gate.accept(mode:"double_press",quantity:1,at:now))
assert(gate.accept(mode:"double_press",quantity:1,at:now.addingTimeInterval(1)))
assert(!gate.accept(mode:"double_press",quantity:1,at:now.addingTimeInterval(5)))
assert(!gate.accept(mode:"double_press",quantity:1,at:now.addingTimeInterval(8)))
gate.reset();assert(!gate.accept(mode:"double_press",quantity:1,at:now))
gate.reset();assert(!gate.accept(mode:"double_press",quantity:1,at:now.addingTimeInterval(1)))
gate.reset();assert(gate.accept(mode:"double_press",quantity:2,at:now))
assert(!gate.accept(mode:"double_press",quantity:0,at:now))
print("PASS: real native click gate single immediate, two close clicks, expiry, reset, coalesced clicks and zero ACK")
'''
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'main.swift';p.write_text(h);subprocess.run(['swift','-module-cache-path',str(Path(d)/'cache'),str(p)],check=True)
