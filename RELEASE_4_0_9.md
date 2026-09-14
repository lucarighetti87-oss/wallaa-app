# Wallaa Personal Safety Ecosystem v4.0.9

## Focus
Single-test consolidation build before the next iPhone install.

### Event-only Wallaa Button semantics
- A paired Shelly BLU Button Tough is **ready** even when it is silent.
- Home no longer turns red only because no packet was received recently.
- Recent press = `Signal verified`; normal silence = `Standby`.
- Red is reserved for real setup failures such as no paired button.
- Safety Level no longer penalizes expected radio silence.

### Connection Guard correction
- Connection Guard is not used for this event-only button model because it does not emit a periodic heartbeat.
- The UI explains this instead of presenting false disconnect alerts.
- Background/locked-screen SOS listening remains active through the native iOS BLE monitor.

### Appearance Auto
- `Auto` follows the current iOS light/dark appearance.
- Changes are applied while Wallaa is open and re-checked when the app returns to foreground.

### Included from v4.0.8
- Immediate SOS dispatch screen with visible progress.
- Active Alert live tracking.
- Native background BLE handling from v4.0.7.
- Guardian siren, QR network, safety word and professional emergency email from previous releases.

## Version
- App: 4.0.9
- iOS build: 10
- Backend change required: **No** (keep the already deployed v4.0.7 backend or later compatible backend).
