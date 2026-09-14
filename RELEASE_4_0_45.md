# Wallaa Safety 4.0.45

## Guardian live-location reliability

- Starts native CoreLocation live tracking immediately when an active SOS alert is persisted, instead of waiting for a later lifecycle/config refresh.
- Keeps native background location updates enabled for the active SOS session.
- Publishes active-alert coordinates at most every 2 seconds while fresh location samples arrive.
- Adds explicit native and JavaScript diagnostics for successful/failed live-location uploads.
- Stops live tracking when the alert is closed or the backend rejects the active alert.
- iOS marketing version 4.0.45, build 48.

No backend API contract change is required; this release continues to use `POST /api/alerts/:id/location`.
