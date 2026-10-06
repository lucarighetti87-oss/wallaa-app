from pathlib import Path
import subprocess, tempfile
root=Path(__file__).resolve().parent.parent
source=(root/'ios/App/App/AppDelegate.swift').read_text()
start=source.index('private enum WallaaMokoGATT {')
end=source.index('private enum WallaaMokoKeychain {',start)
with tempfile.TemporaryDirectory(prefix='wallaa-moko-checks-',dir='/private/tmp') as folder:
    path=Path(folder)
    (path/'main.swift').write_text('import Foundation\n'+source[start:end]+(root/'tests/moko-gatt-checks.swift').read_text())
    subprocess.run(['xcrun','swiftc','-module-cache-path',str(path/'cache'),str(path/'main.swift'),'-o',str(path/'checks')],check=True)
    subprocess.run([str(path/'checks')],check=True)
