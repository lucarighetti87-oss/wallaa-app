# Wallaa 4.0.20 — Release/TestFlight startup hardening

- Build number: 22
- Defers creation of `CBCentralManager` until after UIApplication launch completes.
- Makes the Wallaa native BLE singleton lazy in AppDelegate.
- Avoids replacing the storyboard-created Capacitor window in SceneDelegate.
- Adds native startup markers (`[WALLAA][BOOT]`, `[WALLAA][BLE]`) for device-console diagnostics.
- No change to the public API contract.

This release specifically targets the reproducible issue where Debug opens normally but Release/TestFlight exits immediately.
