# Wallaa App 4.0.66 — Sentinel access fix

Build 69.

## Fix
- Restores the Sentinel navigation entry for every authenticated plan.
- Standard/Basic users can open Sentinel, view the Sentinel network, and apply/serve as Sentinel.
- Pro users retain the Pro entitlement for automatic Sentinel SOS dispatch; this remains enforced by the backend.
- The Sentinel screen, static animated Sentinel map, nearby Sentinel map markers, offers, availability controls, and heartbeat code from 4.0.65 are retained.

## Root cause
The recovered 4.0.65 source still had a stale UI gate in `SideMenu.jsx` (`profile.plan === pro`) even though the Sentinel role and map visibility had already been opened to all authenticated plans elsewhere.

## Build repair
- Fixed malformed Sentinel animation CSS blocks that prevented Vite/PostCSS from compiling `src/styles.css`.
- Sentinel access remains visible for authenticated Standard/Basic and Pro users; Pro entitlement remains relevant to SOS Sentinel dispatch.
