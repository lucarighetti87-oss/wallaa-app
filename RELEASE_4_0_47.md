# Wallaa 4.0.47

- Re-registers the cached APNs device token with the Wallaa backend on every app launch.
- Stores new APNs tokens immediately after native registration.
- Foreground Guardian SOS now creates a local notification using `wallaa-guardian-siren.wav`, because iOS can suppress remote-notification presentation while the app is open.
- Keeps existing bilateral QR pairing and live-SOS behaviour from 4.0.46.
