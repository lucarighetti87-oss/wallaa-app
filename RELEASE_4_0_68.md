# Wallaa 4.0.68 — Sentinel Reliability & Privacy

- Single universal Sentinel heartbeat every 30 seconds while the app is active.
- Immediate heartbeat on startup, foreground return, focus and network recovery.
- Removed duplicate 45-second and page-local 15-second Sentinel presence loops.
- Fixed cleanup of visibility listeners to prevent duplicate pings after remounts.
- Nearby Sentinel polling refreshes every 10 seconds and immediately on foreground/focus/network recovery.
- Transient nearby API failures no longer erase already visible Sentinel markers.
- Nearby API compatibility accepts camelCase and snake_case fields and multiple response shapes.
- Nearby query sends both lat/lng and latitude/longitude for backend compatibility.
- Sentinel markers remain visible on-map or clamped to the map edge when outside the current viewport.
- Bearing-only privacy payloads are rendered as edge markers even when exact Sentinel coordinates are intentionally withheld.
- Sentinel discovery requests location for every authenticated plan, not only Pro.
- Privacy restored: normal map view never exposes Sentinel names, exact distance or intervention counts.
- Sentinel screen no longer exposes exact nearby distances outside an active intervention.
- Version 4.0.68, iOS build 71.
