# Wallaa 4.0.46 — QR Network & Guardian Push reliability

- Build 49.
- Successful QR scan now returns automatically to the app Home instead of leaving the QR/Network flow open.
- Wallaa QR pairing is now treated as a mutual safety relationship by the backend: each person protects the other.
- The Network screen refreshes periodically while the app is visible, so reciprocal connections appear without reopening the app.
- Companion backend 4.0.32 adds reciprocal-link backfill and APNs production/sandbox fallback for physical-device/Xcode testing.
- Existing 4.0.45 live-location fixes are preserved.
