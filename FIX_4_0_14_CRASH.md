# Fix 4.0.14 — immediate TestFlight crash

The uploaded crash report for 4.0.13 (14) shows `NSInvalidArgumentException` with `-[__NSCFBoolean count]` inside `UIApplication _appAdoptsUISceneLifecycle`.

The generated `Info.plist` contained `ITSAppUsesNonExemptEncryption = false` inside both `UIApplicationSceneManifest` and `UISceneConfigurations`. UIKit expects the values under the scene configuration dictionary to be scene configuration arrays, so the Boolean caused the launch abort.

This package removes the nested keys and makes `scripts/patch-native.mjs` clean them on every `cap:sync` before writing a single top-level export-compliance key.

Use Version **1.0**, Build **15** for the next TestFlight/App Store upload.
