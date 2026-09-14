# Wallaa 4.0.48 — build 51

Guardian push presentation fix for iOS / Capacitor 8.

- Foreground presentation uses `badge`, `sound`, `banner`, `list` (the current Capacitor 8 options).
- Keeps `wallaa-guardian-siren.wav` in the iOS Resources build phase.
- Starts the in-app Guardian siren when a `wallaa_sos` push is received in foreground.
- Schedules a local-notification fallback with the Guardian siren.
- Adds Xcode diagnostics for notification authorization and bundled siren.
- Version 4.0.48 / build 51.
