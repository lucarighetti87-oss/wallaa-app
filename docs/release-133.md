# Release 4.0.133 — pairing recovery, responsiveness and energy

Two physical iPhone crash reports from build 131 on 2026-10-14 were inspected locally: 19:41:50 and 19:50:19. Both are scene-update watchdog terminations (0x8BADF00D); the first waits in notification cancellation, the second in CoreLocation IPC; both report critical thermal state. Reports and personal device data are not committed.

Changes:
- Filter UserDefaults notifications to actual configuration, active SOS and Sentinel changes. Telemetry no longer retriggers configuration reconciliation.
- Make disconnect reminder cancellation idempotent, remove nonexistent saved state only when present, and serialize notification scheduling/cancellation off the main queue. Preserve at most three reminders five minutes apart.
- Reconcile standard/significant location monitoring only when its mode changes. Ordinary Pro readiness uses a one-shot fix and significant changes; Sentinel uses 100 m desired accuracy and 50 m distance; active SOS retains precise continuous tracking. Remove duplicate iOS JavaScript position watches. Back off repeated connection failures.
- Reuse one initialized Bluetooth central through discovery and setup. Allow 20 s to connect and omit unused descriptor discovery. Report the setup stage on timeout.
- Recover Apple-authorized accessories after an interrupted first association; explicitly selecting another button still uses the Apple picker.
- Add local removal including Apple's accessory authorization. Local removal does not release backend ownership: transfer remains an authenticated admin-only operation.
- Keep the Sentinel decorative sweep inside Home rather than a resizing fixed viewport; preserve stacking below interactive content and reduced-motion behavior.

Validation:
- App unit suite: 69 passing.
- WebKit suite: 71 passing initially; the changed Home scroll expectation passed in the subsequent 8-test Home/network run (72 cases covered).
- Native Swift fixture tests exercise actual extracted pairing, notification, configuration observer and energy policy code. Notification repeated calls and location repeated reconciliations do not duplicate work.
- Signed Release archive compiled successfully (recompiled after final changes).
- Backend ownership/admin unlock regression suite previously passed: 77 tests; no backend change in this release.

Limits:
The failing new user's iPhone is unavailable. Luca's already-working iPhone is available; its existing pairing cannot validate first-time pairing on the other phone. Full physical button transfer/re-pair, overnight Health Check, real SOS delivery and long-duration battery measurements remain required. No real SOS is sent during this investigation. No claim of launch readiness or measured battery savings is made. Server ownership revocation is verified; immediate radio release from an offline old phone is not guaranteed.
