import fs from 'node:fs';
import path from 'node:path';

function insertBefore(text, marker, addition) {
  if (text.includes(addition.trim())) return text;
  const index = text.lastIndexOf(marker);
  if (index === -1) return text;
  return `${text.slice(0, index)}${addition}${text.slice(index)}`;
}

function ensurePlistKey(text, key, xml) {
  if (text.includes(`<key>${key}</key>`)) return text;
  return insertBefore(text, '</dict>', `
	<key>${key}</key>
${xml}
`);
}

const iosPlist = path.resolve('ios/App/App/Info.plist');
if (fs.existsSync(iosPlist)) {
  let plist = fs.readFileSync(iosPlist, 'utf8');
  // Export compliance must live at the TOP LEVEL of Info.plist.
  // v4.0.13 could accidentally insert this key inside UIApplicationSceneManifest,
  // which makes UIKit treat a Boolean as a scene-configuration collection and crash at launch.
  plist = plist.replace(/\s*<key>ITSAppUsesNonExemptEncryption<\/key>\s*<(?:true|false)\/>/g, '');
  plist = ensurePlistKey(plist, 'ITSAppUsesNonExemptEncryption', '\t<false/>');
  plist = plist.replace(/<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/, '<key>CFBundleDisplayName</key>\n\t<string>WALLAA</string>');
  plist = ensurePlistKey(plist, 'NSBluetoothAlwaysUsageDescription', '\t<string>Wallaa Safe Button usa Bluetooth per ricevere gli eventi del Wallaa Button.</string>');
  plist = ensurePlistKey(plist, 'NSLocationWhenInUseUsageDescription', '\t<string>Wallaa Safe Button usa la posizione per inviarla alle persone di fiducia quando attivi un alert.</string>');
  plist = ensurePlistKey(plist, 'NSLocationAlwaysAndWhenInUseUsageDescription', '\t<string>Wallaa Safe Button può aver bisogno della posizione quando un alert viene attivato mentre l’app è in background.</string>');
  plist = ensurePlistKey(plist, 'NSCameraUsageDescription', '\t<string>Wallaa Safe Button usa la fotocamera per scansionare i QR personali della Rete Wallaa.</string>');
  plist = ensurePlistKey(plist, 'UIBackgroundModes', '\t<array>\n\t\t<string>bluetooth-central</string>\n\t\t<string>location</string>\n\t\t<string>remote-notification</string>\n\t</array>');
  // App Store 1.0 scope: iPhone portrait only. This prevents untested iPad/landscape layouts from being advertised.
  plist = plist.replace(/\t<key>UISupportedInterfaceOrientations<\/key>\n\t<array>[\s\S]*?\t<\/array>/, '\t<key>UISupportedInterfaceOrientations</key>\n\t<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>');
  plist = plist.replace(/\t<key>UISupportedInterfaceOrientations~ipad<\/key>\n\t<array>[\s\S]*?\t<\/array>/, '\t<key>UISupportedInterfaceOrientations~ipad</key>\n\t<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>');
  fs.writeFileSync(iosPlist, plist);
  console.log('✓ Info.plist Wallaa Safe Button aggiornato (iPhone portrait)');
}

// Release-safe startup guard: keep CoreBluetooth initialization deferred until after launch.
const appDelegate = path.resolve('ios/App/App/AppDelegate.swift');
if (fs.existsSync(appDelegate)) {
  let swift = fs.readFileSync(appDelegate, 'utf8');
  const methodBlock = `\n    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {\n        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)\n    }\n\n    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {\n        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)\n    }\n`;
  if (!swift.includes('capacitorDidRegisterForRemoteNotifications')) {
    const lastBrace = swift.lastIndexOf('}');
    if (lastBrace !== -1) swift = `${swift.slice(0, lastBrace)}${methodBlock}${swift.slice(lastBrace)}`;
    fs.writeFileSync(appDelegate, swift);
    console.log('✓ AppDelegate configurato per APNs');
  }
}


// Wallaa guardian siren: custom APNs sound must be in the app main bundle.
const guardianSirenSource = path.resolve('public/wallaa-guardian-siren.wav');
const guardianSirenNative = path.resolve('ios/App/App/wallaa-guardian-siren.wav');
if (fs.existsSync(guardianSirenSource)) {
  fs.copyFileSync(guardianSirenSource, guardianSirenNative);
  console.log('✓ Sirena guardiano copiata nel bundle iOS');
}

const iosProject = path.resolve('ios/App/App.xcodeproj/project.pbxproj');
if (fs.existsSync(iosProject)) {
  let project = fs.readFileSync(iosProject, 'utf8');
  project = project.replace(/TARGETED_DEVICE_FAMILY = "1,2";/g, 'TARGETED_DEVICE_FAMILY = 1;');
  project = project.replace(/TARGETED_DEVICE_FAMILY = 2;/g, 'TARGETED_DEVICE_FAMILY = 1;');
  project = project.replace(/CURRENT_PROJECT_VERSION = \d+;/g, 'CURRENT_PROJECT_VERSION = 68;');
  project = project.replace(/MARKETING_VERSION = [^;]+;/g, 'MARKETING_VERSION = 4.0.65;');

  const sirenFileRef = 'AA4060010000000000000001';
  const sirenBuildRef = 'AA4060020000000000000002';
  if (!project.includes('wallaa-guardian-siren.wav')) {
    project = project.replace('/* End PBXBuildFile section */', `\t\t${sirenBuildRef} /* wallaa-guardian-siren.wav in Resources */ = {isa = PBXBuildFile; fileRef = ${sirenFileRef} /* wallaa-guardian-siren.wav */; };\n/* End PBXBuildFile section */`);
    project = project.replace('/* End PBXFileReference section */', `\t\t${sirenFileRef} /* wallaa-guardian-siren.wav */ = {isa = PBXFileReference; lastKnownFileType = audio.wav; path = "wallaa-guardian-siren.wav"; sourceTree = "<group>"; };\n/* End PBXFileReference section */`);
    project = project.replace('\t\t\t\t50B271D01FEDC1A000F3C39B /* public */,', `\t\t\t\t50B271D01FEDC1A000F3C39B /* public */,\n\t\t\t\t${sirenFileRef} /* wallaa-guardian-siren.wav */,`);
    project = project.replace('\t\t\t\t2FAD9763203C412B000D30F8 /* config.xml in Resources */,', `\t\t\t\t2FAD9763203C412B000D30F8 /* config.xml in Resources */,\n\t\t\t\t${sirenBuildRef} /* wallaa-guardian-siren.wav in Resources */,`);
  }

  const privacyFileRef = 'AA4110010000000000000001';
  const privacyBuildRef = 'AA4110020000000000000002';
  if (!project.includes('PrivacyInfo.xcprivacy')) {
    project = project.replace('/* End PBXBuildFile section */', `\t\t${privacyBuildRef} /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = ${privacyFileRef} /* PrivacyInfo.xcprivacy */; };\n/* End PBXBuildFile section */`);
    project = project.replace('/* End PBXFileReference section */', `\t\t${privacyFileRef} /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };\n/* End PBXFileReference section */`);
    project = project.replace('\t\t\t\t50B271D01FEDC1A000F3C39B /* public */,', `\t\t\t\t50B271D01FEDC1A000F3C39B /* public */,\n\t\t\t\t${privacyFileRef} /* PrivacyInfo.xcprivacy */,`);
    project = project.replace('\t\t\t\t2FAD9763203C412B000D30F8 /* config.xml in Resources */,', `\t\t\t\t2FAD9763203C412B000D30F8 /* config.xml in Resources */,\n\t\t\t\t${privacyBuildRef} /* PrivacyInfo.xcprivacy in Resources */,`);
  }

  fs.writeFileSync(iosProject, project);
  console.log('✓ Target iOS limitato a iPhone + sirena APNs registrata');
}

const androidManifest = path.resolve('android/app/src/main/AndroidManifest.xml');
if (fs.existsSync(androidManifest)) {
  let manifest = fs.readFileSync(androidManifest, 'utf8');
  const marker = '<application';
  const permissions = [
    '<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />',
    '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />',
    '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
    '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
    '<uses-permission android:name="android.permission.CAMERA" />',
    '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />'
  ];
  for (const permission of permissions) manifest = insertBefore(manifest, marker, `    ${permission}\n`);
  fs.writeFileSync(androidManifest, manifest);
  console.log('✓ AndroidManifest Wallaa Safe Button aggiornato');
}
