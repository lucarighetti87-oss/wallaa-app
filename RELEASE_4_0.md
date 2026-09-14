# Wallaa Personal Safety Ecosystem v4.0 — Development Milestone

## UX / UI

- Home connected / weak / disconnected.
- Dynamic telemetry and Safety Level.
- Friendly sand-colored Wallaa Button 3D plus green/amber/red radar.
- System / Light / Dark appearance.
- Emergency views forced to high contrast.
- Side menu and five-tab bottom dock.

## SOS safety flow

1. User presses and keeps holding the Home SOS button.
2. Full-screen emergency activation opens immediately.
3. 3-second countdown runs while the physical press continues.
4. Releasing early cancels.
5. Completion creates the alert, initial GPS point and live session.
6. Live location is streamed using a location watch and throttled backend updates.
7. `I'M SAFE` requires a second deliberate hold before the session is closed.

## Connection Guard

- BLE monitoring remains BTHome advertising based.
- UI connection state uses fixed connected / weak / disconnected windows.
- Alert Delay controls when the guard is raised, not the visual BLE state.
- Backend heartbeat is sent on state transitions only.
- Disconnect notification supports authorized email contacts and Wallaa Network push guardians.

## Privacy permissions

- SOS Alerts controls receipt of the emergency alert.
- Live Location controls whether GPS/live URL is included for that recipient.
- Disconnect Alerts controls Connection Guard notices.
- Account deletion cascades Wallaa account-linked PostgreSQL records.

## Backend additions

- `wallaa_devices`
- `wallaa_active_alerts`
- `wallaa_location_history`
- `wallaa_device_heartbeats`
- guardian permission fields on `wallaa_links`
- `/api/device/heartbeat`
- `/api/alerts/:id/location`
- `/api/alerts/:id/close`
- `/api/live/:token`
- `/live/:token`
- `/api/account`

## Build note

The source archive is intentionally distributed without `node_modules` and without production secret files. Run `npm install` on the target Mac before building for TestFlight.
